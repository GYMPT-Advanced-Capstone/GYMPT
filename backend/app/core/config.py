from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


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
        return (
            f"mysql+pymysql://{self.MYSQL_USER}:{self.MYSQL_PASSWORD}"
            f"@{self.MYSQL_HOST}:{self.MYSQL_PORT}/{self.MYSQL_DATABASE}"
            "?ssl_verify_cert=true"
        )


settings = Settings()  # type: ignore[call-arg]
