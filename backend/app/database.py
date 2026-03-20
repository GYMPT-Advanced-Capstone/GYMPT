from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

DATABASE_URL = "mysql+pymysql://367D6EcQt8wXeso.dev1:1234@gateway01.ap-northeast-1.prod.aws.tidbcloud.com:4000/team_project_db?ssl_verify_cert=true"

engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()