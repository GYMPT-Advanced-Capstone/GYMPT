from sqlalchemy import Column, Integer, String
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

class Exercise(Base):
    __tablename__ = "exercise"

    no = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    imagepath = Column(String(255))