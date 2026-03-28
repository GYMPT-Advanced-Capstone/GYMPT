import hashlib
import logging
import secrets
from datetime import datetime, timedelta, timezone
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
    user_part, domain = email.rsplit("@", 1)
    if not user_part or not domain:
        return "unknown"
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


def store_refresh_token(email: str, token: str, expires_delta: timedelta) -> None:
    redis_client = get_redis_client()
    ttl = int(expires_delta.total_seconds())
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    redis_client.setex(f"RT:{email}", ttl, token_hash)


def verify_access_token(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> tuple[str, str]:
    settings = get_settings()
    redis_client = get_redis_client()
    token = credentials.credentials

    token_hash = hashlib.sha256(token.encode()).hexdigest()
    try:
        is_blacklisted = redis_client.get(f"AT:{token_hash}")
    except redis.RedisError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="인증 서버에 일시적인 오류가 발생했습니다.",
        )
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
    settings = get_settings()
    redis_client = get_redis_client()

    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
    except JWTError as e:
        logger.warning(f"Invalid refresh token during revocation: {e}")
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

    stored_hash = redis_client.get(f"RT:{email}")
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    if stored_hash != token_hash:
        logger.warning("Refresh token revocation failed: token hash mismatch")
        return

    redis_client.delete(f"RT:{email}")

    if exp is not None:
        now = datetime.now(timezone.utc).timestamp()
        ttl = int(exp - now)
        if ttl > 0:
            redis_client.setex(f"RT_BL:{token_hash}", ttl, "revoked")


def generate_verification_code() -> str:
    return str(secrets.randbelow(1000000)).zfill(6)


def store_verification_code(email: str, code: str) -> None:
    redis_client = get_redis_client()
    settings = get_settings()
    ttl = settings.VERIFICATION_CODE_EXPIRE_MINUTES * 60
    redis_client.setex(f"EMAIL_CODE:{email}", ttl, code)


def store_email_verified(email: str) -> None:
    redis_client = get_redis_client()
    settings = get_settings()
    ttl = settings.VERIFICATION_CODE_EXPIRE_MINUTES * 60
    redis_client.setex(f"VERIFIED:{email}", ttl, "1")


def is_email_verified(email: str) -> bool:
    redis_client = get_redis_client()
    return redis_client.get(f"VERIFIED:{email}") == "1"


def delete_email_verified(email: str) -> None:
    redis_client = get_redis_client()
    redis_client.delete(f"VERIFIED:{email}")


def verify_verification_code(email: str, code: str) -> bool:
    redis_client = get_redis_client()
    stored = redis_client.get(f"EMAIL_CODE:{email}")
    if stored == code:
        redis_client.delete(f"EMAIL_CODE:{email}")
        return True
    return False


def invalidate_user_session(email: str) -> None:
    redis_client = get_redis_client()
    redis_client.delete(f"RT:{email}")


def verify_refresh_token(token: str) -> str:
    settings = get_settings()
    redis_client = get_redis_client()

    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        email = payload.get("sub")
        token_type = payload.get("type")

        if not isinstance(email, str) or token_type != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="유효하지 않은 토큰입니다.",
            )

        token_hash = hashlib.sha256(token.encode()).hexdigest()
        try:
            stored_hash = redis_client.get(f"RT:{email}")
        except redis.RedisError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="인증 서버에 일시적인 오류가 발생했습니다.",
            )

        if stored_hash != token_hash:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="유효하지 않거나 만료된 리프레시 토큰입니다.",
            )
        return email

    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="유효하지 않거나 만료된 토큰입니다.",
        )


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
            token_hash = hashlib.sha256(access_token.encode()).hexdigest()
            redis_client.setex(f"AT:{token_hash}", ttl, "logout")
    except JWTError as e:
        logger.error(
            f"JWTError during access token blacklisting for {masked_email}: {str(e)}"
        )
