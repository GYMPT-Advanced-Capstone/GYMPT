from sqlalchemy import BigInteger, Column, String
from sqlalchemy.orm import relationship

from app.core.database import Base


class Exercise(Base):
    __tablename__ = "exercises"

    id = Column(BigInteger, primary_key=True, index=True)
    name = Column(String(50), nullable=False)
    description = Column(String(250), nullable=True)

    records = relationship("ExerciseRecord", back_populates="exercise")
    goals = relationship("UserExerciseGoal", back_populates="exercise")
