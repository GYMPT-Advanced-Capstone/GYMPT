from datetime import datetime, timedelta, timezone
import logging
from jose import jwt, JWTError
from passlib.context import CryptContext
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import redis
from app.core.config import get_settings

settings = get_settings()
SECRET_KEY = settings.SECRET_KEY
ALGORITHM = settings.ALGORITHM
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()
logger = logging.getLogger(__name__)

redis_client = redis.Redis(
    host=settings.REDIS_HOST, port=settings.REDIS_PORT, db=0, decode_responses=True
)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_token(data: dict, expires_delta: timedelta) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + expires_delta
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def store_refresh_token(email: str, token: str, expires_delta: timedelta):
    ttl = int(expires_delta.total_seconds())
    redis_client.setex(f"RT:{email}", ttl, token)


def verify_access_token(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> tuple[str, str]:
    token = credentials.credentials

    is_blacklisted = redis_client.get(f"AT:{token}")
    if is_blacklisted:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="로그아웃된 토큰입니다."
        )

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
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


def revoke_tokens(access_token: str, refresh_token: str, email: str) -> None:
    try:
        payload = jwt.decode(refresh_token, SECRET_KEY, algorithms=[ALGORITHM])

        if payload.get("type") == "refresh" and payload.get("sub") == email:
            redis_client.delete(f"RT:{email}")
        else:
            logger.warning(
                f"Invalid refresh token attempt for email: {email}. Payload type or sub mismatch."
            )

    except JWTError as e:
        logger.error(f"JWTError during refresh token revocation for {email}: {str(e)}")

    try:
        payload = jwt.decode(access_token, SECRET_KEY, algorithms=[ALGORITHM])
        exp = payload.get("exp")

        if exp is None:
            logger.warning(
                f"Access token for {email} missing 'exp' claim. Skipping blacklist."
            )
            return

        now = datetime.now(timezone.utc).timestamp()
        ttl = int(exp - now)

        if ttl > 0:
            redis_client.setex(f"AT:{access_token}", ttl, "logout")
    except JWTError as e:
        logger.error(f"JWTError during access token blacklisting for {email}: {str(e)}")
