from pydantic_settings import BaseSettings
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent


class Settings(BaseSettings):
    database_url: str = "mysql+pymysql://367D6EcQt8wXeso.dev1:1234@gateway01.ap-northeast-1.prod.aws.tidbcloud.com:4000/team_project_db?ssl_verify_cert=true"

    class Config:
        env_file = BASE_DIR / ".env"
        extra = "ignore"


settings = Settings()
