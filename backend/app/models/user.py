from sqlalchemy import Column, Integer, String
from app.core.database import Base

class User(Base):
    __tablename__ = "user"

    no = Column(Integer, primary_key=True, index=True)
    email = Column(String(100), unique=True, index=True, nullable=False)
    pw = Column(String(255), nullable=False)
    name = Column(String(50), nullable=False)
    nickname = Column(String(50), nullable=False)
    # phnum = Column(String(100), nullable=False)
    birth_date = Column(String(20), nullable=True)