from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.users.models import User
from app.users.schemas import BirthDateUpdate, UserResponse, WeeklyTargetUpdate
from app.auth.utils import verify_access_token


router = APIRouter(prefix="/api/v1/users", tags=["Users"])


@router.patch("/me/birth-date", response_model=UserResponse)
def update_birth_date(
    data: BirthDateUpdate,
    token_data: tuple[str, str] = Depends(verify_access_token),
    db: Session = Depends(get_db),
):
    email, _ = token_data
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="유저를 찾을 수 없습니다."
        )
    user.birth_date = data.birth_date  # type: ignore[assignment]
    db.commit()
    db.refresh(user)
    return user


@router.patch("/me/weekly-target", response_model=UserResponse)
def update_weekly_target(
    data: WeeklyTargetUpdate,
    token_data: tuple[str, str] = Depends(verify_access_token),
    db: Session = Depends(get_db),
):
    email, _ = token_data
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="유저를 찾을 수 없습니다."
        )
    user.weekly_target = data.weekly_target  # type: ignore[assignment]
    db.commit()
    db.refresh(user)
    return user
