from datetime import datetime, timedelta, timezone
import hashlib
import logging
from jose import jwt, JWTError
from passlib.context import CryptContext
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import redis
from functools import lru_cache
from app.core.config import get_settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()
logger = logging.getLogger(__name__)


@lru_cache()
def get_redis_client():
    settings = get_settings()
    return redis.Redis(
        host=settings.REDIS_HOST, port=settings.REDIS_PORT, db=0, decode_responses=True
    )


def mask_email(email: str) -> str:
    if not email or "@" not in email:
        return "unknown"
    user_part, domain = email.split("@")
    masked_user = (
        user_part[:2] + "*" * (len(user_part) - 2)
        if len(user_part) > 2
        else user_part + "*"
    )
    return f"{masked_user}@{domain}"


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_token(data: dict, expires_delta: timedelta) -> str:
    settings = get_settings()
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + expires_delta
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def store_refresh_token(email: str, token: str, expires_delta: timedelta):
    redis_client = get_redis_client()
    ttl = int(expires_delta.total_seconds())
    redis_client.setex(f"RT:{email}", ttl, token)


def verify_access_token(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> tuple[str, str]:
    settings = get_settings()
    redis_client = get_redis_client()
    token = credentials.credentials

    is_blacklisted = redis_client.get(f"AT:{token}")
    if is_blacklisted:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="로그아웃된 토큰입니다."
        )

    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        email = payload.get("sub")
        token_type = payload.get("type")

        if not isinstance(email, str) or token_type != "access":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="유효하지 않은 토큰입니다.",
            )
        return email, token

    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="유효하지 않거나 만료된 토큰입니다.",
        )


def revoke_refresh_token(token: str, expected_sub: str | None = None) -> None:
    """Validates and revokes a refresh token by writing it to the denylist.

    If expected_sub is provided, the token's sub claim must match it.
    """
    settings = get_settings()
    redis_client = get_redis_client()

    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
    except JWTError as e:
        logger.warning(f"Invalid refresh token during revocation: {str(e)}")
        return

    token_type = payload.get("type")
    email = payload.get("sub")
    exp = payload.get("exp")

    if token_type != "refresh" or not isinstance(email, str):
        logger.warning("Refresh token revocation failed: invalid type or missing sub")
        return

    if expected_sub is not None and email != expected_sub:
        logger.warning("Refresh token revocation failed: sub mismatch")
        return

    redis_client.delete(f"RT:{email}")

    if exp is not None:
        now = datetime.now(timezone.utc).timestamp()
        ttl = int(exp - now)
        if ttl > 0:
            token_hash = hashlib.sha256(token.encode()).hexdigest()
            redis_client.setex(f"RT_BL:{token_hash}", ttl, "revoked")


def revoke_tokens(access_token: str, refresh_token: str, email: str) -> None:
    masked_email = mask_email(email)
    settings = get_settings()
    redis_client = get_redis_client()

    revoke_refresh_token(refresh_token, expected_sub=email)

    try:
        payload = jwt.decode(
            access_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        exp = payload.get("exp")

        if exp is None:
            logger.warning(
                f"Access token for {masked_email} missing 'exp' claim. Skipping blacklist."
            )
            return

        now = datetime.now(timezone.utc).timestamp()
        ttl = int(exp - now)

        if ttl > 0:
            redis_client.setex(f"AT:{access_token}", ttl, "logout")
    except JWTError as e:
        logger.error(
            f"JWTError during access token blacklisting for {masked_email}: {str(e)}"
        )
