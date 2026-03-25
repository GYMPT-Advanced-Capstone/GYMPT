from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.core.database import get_db
from app.core.config import get_settings
from app.users.models import User
from app.auth.schemas import (
    UserCreate,
    UserLogin,
    UserLogout,
    TokenResponse,
)
from app.users.schemas import UserResponse
from app.auth.utils import (
    get_password_hash,
    verify_password,
    create_token,
    store_refresh_token,
    verify_access_token,
    revoke_tokens,
)


router = APIRouter(prefix="/api/v1/auth", tags=["Auth"])


@router.post(
    "/signup", response_model=UserResponse, status_code=status.HTTP_201_CREATED
)
def signup(user_data: UserCreate, db: Session = Depends(get_db)):
    hashed_pw = get_password_hash(user_data.pw)
    new_user = User(
        email=user_data.email,
        pw=hashed_pw,
        name=user_data.name,
        nickname=user_data.nickname,
    )
    try:
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        return new_user
    except IntegrityError as e:
        db.rollback()
        if "email" in str(e.orig).lower():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT, detail="이미 가입된 이메일입니다."
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="서버 오류가 발생했습니다.",
        )


@router.post("/login", response_model=TokenResponse)
def login(user_data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == user_data.email).first()
    if not user or not verify_password(user_data.pw, str(user.pw)):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="이메일 또는 비밀번호가 올바르지 않습니다.",
        )

    settings = get_settings()
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    refresh_token_expires = timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

    access_token = create_token(
        data={"sub": user.email, "type": "access"}, expires_delta=access_token_expires
    )
    refresh_token = create_token(
        data={"sub": user.email, "type": "refresh"}, expires_delta=refresh_token_expires
    )

    store_refresh_token(str(user.email), refresh_token, refresh_token_expires)

    return TokenResponse(
        success=True,
        message="로그인 성공",
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="Bearer",
    )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    logout_data: UserLogout, token_data: tuple[str, str] = Depends(verify_access_token)
):
    email, access_token = token_data
    revoke_tokens(access_token, logout_data.refresh_token, email)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
