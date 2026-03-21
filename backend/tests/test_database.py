from unittest.mock import patch

from app.core.config import get_settings
from app.core.database import get_engine


# config 단위 테스트
def test_database_url_format(mock_env_vars):
    get_settings.cache_clear()

    settings = get_settings()

    expected_url = (
        "mysql+pymysql://test_user:test_password"
        "@localhost:3306/test_db"
        "?ssl_verify_cert=true"
    )

    assert settings.database_url == expected_url


# config, database 연결 테스트
def test_database_engine_uses_config_url(mock_env_vars):
    get_settings.cache_clear()

    with patch("app.core.database.create_engine") as mock_create_engine:
        get_engine()

        args, kwargs = mock_create_engine.call_args

        expected_url = (
            "mysql+pymysql://test_user:test_password"
            "@localhost:3306/test_db"
            "?ssl_verify_cert=true"
        )

        assert args[0] == expected_url
