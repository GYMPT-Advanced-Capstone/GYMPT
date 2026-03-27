from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.utils import verify_access_token
from app.core.database import get_db
from app.users.models import User


def get_current_user_id(
    token_data: tuple[str, str] = Depends(verify_access_token),
    db: Session = Depends(get_db),
) -> int:
    email, _ = token_data
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="유저를 찾을 수 없습니다.",
        )
    return int(user.id)
