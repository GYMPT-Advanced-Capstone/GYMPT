from sqlalchemy import Column, Integer, String, DateTime, Date
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class User(Base):
    __tablename__ = "user"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    pw = Column(String(255), nullable=False)
    name = Column(String(100), nullable=False)
    nickname = Column(String(100), nullable=False)
    birth_date = Column(Date, nullable=True)
    weekly_target = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    exercise_records = relationship("ExerciseRecord", back_populates="user")
