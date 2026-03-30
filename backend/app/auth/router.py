import logging
import re
from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, Query, status, Response
from pydantic import EmailStr
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.core.database import get_db
from app.core.config import get_settings
from app.core.email import send_verification_email
from app.users.models import User
from app.auth.dto.auth_request import (
    EmailVerifyConfirmRequest,
    EmailVerifyRequest,
    LoginRequest,
    LogoutRequest,
    PasswordResetConfirmRequest,
    PasswordResetRequest,
    SignupRequest,
    TokenRefreshRequest,
)
from app.auth.dto.auth_response import (
    CheckResponse,
    TokenResponse,
)
from app.users.schemas import UserResponse
from app.auth.utils import (
    generate_verification_code,
    get_password_hash,
    store_verification_code,
    verify_password,
    verify_verification_code,
    verify_refresh_token,
    create_token,
    store_refresh_token,
    verify_access_token,
    revoke_tokens,
    invalidate_user_session,
    mask_email,
    store_email_verified,
    is_email_verified,
    delete_email_verified,
)


logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/auth", tags=["Auth"])


@router.post(
    "/signup", response_model=UserResponse, status_code=status.HTTP_201_CREATED
)
def signup(user_data: SignupRequest, db: Session = Depends(get_db)):
    if not is_email_verified(user_data.email):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="이메일 인증이 완료되지 않았습니다.",
        )
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
        try:
            delete_email_verified(user_data.email)
        except Exception:
            logger.warning(
                f"Redis cleanup failed for {mask_email(user_data.email)} after signup"
            )
        return new_user
    except IntegrityError as e:
        db.rollback()
        orig = e.orig
        orig_str = str(orig).lower()
        is_1062 = orig is not None and orig.args and orig.args[0] == 1062
        is_unique_failed = (
            "unique constraint failed" in orig_str or "duplicate entry" in orig_str
        )
        if is_1062 or is_unique_failed:
            if re.search(
                r"unique constraint failed.*nickname|duplicate entry.*nickname",
                orig_str,
            ):
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="이미 사용 중인 닉네임입니다.",
                )
            if re.search(
                r"unique constraint failed.*email|duplicate entry.*email", orig_str
            ):
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="이미 가입된 이메일입니다.",
                )
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT, detail="이미 사용 중인 값입니다."
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="서버 오류가 발생했습니다.",
        )


@router.post("/login", response_model=TokenResponse)
def login(user_data: LoginRequest, db: Session = Depends(get_db)):
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
    logout_data: LogoutRequest,
    token_data: tuple[str, str] = Depends(verify_access_token),
):
    email, access_token = token_data
    revoke_tokens(access_token, logout_data.refresh_token, email)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/email-verify/request", status_code=status.HTTP_204_NO_CONTENT)
def request_email_verify(data: EmailVerifyRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="이미 가입된 이메일입니다.",
        )
    code = generate_verification_code()
    store_verification_code(data.email, code)
    send_verification_email(
        data.email, code, subject="[GYMPT] 회원가입 인증 코드", purpose="회원가입"
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/email-verify", status_code=status.HTTP_204_NO_CONTENT)
def verify_email(data: EmailVerifyConfirmRequest):
    is_valid = verify_verification_code(data.email, data.code)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="인증 코드가 올바르지 않거나 만료되었습니다.",
        )
    store_email_verified(data.email)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/check-email", response_model=CheckResponse)
def check_email(email: EmailStr = Query(...), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == email).first()
    return CheckResponse(available=user is None)


@router.get("/check-nickname", response_model=CheckResponse)
def check_nickname(
    nickname: str = Query(..., min_length=1, max_length=100),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.nickname == nickname).first()
    return CheckResponse(available=user is None)


@router.post("/refresh", response_model=TokenResponse)
def refresh_token(data: TokenRefreshRequest):
    email = verify_refresh_token(data.refresh_token)
    settings = get_settings()
    refresh_token_expires = timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

    new_access_token = create_token(
        data={"sub": email, "type": "access"},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    new_refresh_token = create_token(
        data={"sub": email, "type": "refresh"},
        expires_delta=refresh_token_expires,
    )
    store_refresh_token(email, new_refresh_token, refresh_token_expires)

    return TokenResponse(
        success=True,
        message="토큰 재발급 성공",
        access_token=new_access_token,
        refresh_token=new_refresh_token,
        token_type="Bearer",
    )


@router.post("/password-reset/request", status_code=status.HTTP_204_NO_CONTENT)
def request_password_reset(data: PasswordResetRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="등록되지 않은 이메일입니다.",
        )
    code = generate_verification_code()
    store_verification_code(data.email, code)
    send_verification_email(
        data.email,
        code,
        subject="[GYMPT] 비밀번호 재설정 인증 코드",
        purpose="비밀번호 재설정",
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/password-reset", status_code=status.HTTP_204_NO_CONTENT)
def reset_password(data: PasswordResetConfirmRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="존재하지 않는 사용자입니다.",
        )
    is_valid = verify_verification_code(data.email, data.code)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="인증 코드가 올바르지 않거나 만료되었습니다.",
        )
    user.pw = get_password_hash(data.new_password)  # type: ignore[assignment]
    db.commit()
    invalidate_user_session(data.email)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
