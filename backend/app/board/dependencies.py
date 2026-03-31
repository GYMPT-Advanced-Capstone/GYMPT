from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.users.models import User
from app.auth.utils import verify_access_token


def get_current_user(
    token_data: tuple[str, str] = Depends(verify_access_token),
    db: Session = Depends(get_db),
) -> User:
    email, _ = token_data

    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="유저를 찾을 수 없습니다.",
        )

    return user
