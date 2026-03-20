from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy import URL


BASE_DIR = Path(__file__).resolve().parents[3]
ENV_FILE = BASE_DIR / "docker" / ".env"


class Settings(BaseSettings):
    MYSQL_HOST: str
    MYSQL_PORT: int = 4000
    MYSQL_DATABASE: str
    MYSQL_USER: str
    MYSQL_PASSWORD: str

    model_config = SettingsConfigDict(
        env_file=ENV_FILE,
        extra="ignore",
    )

    @property
    def database_url(self) -> str:
        return URL.create(
            drivername="mysql+pymysql",
            username=self.MYSQL_USER,
            password=self.MYSQL_PASSWORD,
            host=self.MYSQL_HOST,
            port=self.MYSQL_PORT,
            database=self.MYSQL_DATABASE,
            query={"ssl_verify_cert": "true"},
        ).render_as_string(hide_password=False)


settings = Settings()  # type: ignore[call-arg]
