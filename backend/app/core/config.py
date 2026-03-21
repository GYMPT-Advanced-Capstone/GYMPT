from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    MYSQL_HOST: str
    MYSQL_PORT: int
    MYSQL_USER: str
    MYSQL_PASSWORD: str
    MYSQL_DATABASE: str

    @property
    def database_url(self) -> str:
        base = (
            f"mysql+pymysql://{self.MYSQL_USER}:{self.MYSQL_PASSWORD}"
            f"@{self.MYSQL_HOST}:{self.MYSQL_PORT}/{self.MYSQL_DATABASE}"
        )

        # ✅ 로컬 환경에서는 SSL 제거
        if self.MYSQL_HOST in ("localhost", "127.0.0.1"):
            return base

        # ✅ 클라우드 DB(TiDB)에서는 SSL 사용
        return base + "?ssl_verify_cert=true"

    model_config = SettingsConfigDict(extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]
