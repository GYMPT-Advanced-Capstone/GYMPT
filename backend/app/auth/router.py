from typing import Annotated
from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.core.database import get_db
from app.auth.models import User
from app.auth.schemas import (
    UserCreate,
    UserLogin,
    UserLogout,
    TokenResponse,
    UserResponse,
)
from app.auth.utils import get_password_hash, verify_password, create_token

router = APIRouter(prefix="/api/v1/auth", tags=["Auth"])


@router.post(
    "/signup", response_model=UserResponse, status_code=status.HTTP_201_CREATED
)
def signup(user: UserCreate, db: Annotated[Session, Depends(get_db)]):
    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="이미 존재하는 이메일입니다."
        )

    new_user = User(
        email=user.email,
        pw=get_password_hash(user.pw),
        name=user.name,
        nickname=user.nickname,
    )

    try:
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="이미 존재하는 이메일입니다."
        )

    return new_user


@router.post("/login", response_model=TokenResponse)
def login(user_credentials: UserLogin, db: Annotated[Session, Depends(get_db)]):
    user = db.query(User).filter(User.email == user_credentials.email).first()

    if not user or not verify_password(user_credentials.pw, user.pw):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="이메일 또는 비밀번호가 올바르지 않습니다.",
        )

    access_token = create_token({"sub": user.email}, timedelta(minutes=30))
    refresh_token = create_token(
        {"sub": user.email, "type": "refresh"}, timedelta(days=14)
    )

    return {
        "success": True,
        "message": "로그인에 성공했습니다.",
        "token_type": "Bearer",
        "access_token": access_token,
        "refresh_token": refresh_token,
    }


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(logout_data: UserLogout):
    return Response(status_code=status.HTTP_204_NO_CONTENT)
