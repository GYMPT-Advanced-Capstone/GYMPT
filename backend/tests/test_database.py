from app.core.config import get_settings
from app.core.database import get_engine


def test_database_url_localhost(mock_env_vars):
    get_settings.cache_clear()
    settings = get_settings()

    expected_url = "mysql+pymysql://test_user:test_password@localhost:3306/test_db"

    assert settings.database_url == expected_url


def test_database_url_loopback(mock_env_vars, monkeypatch):
    monkeypatch.setenv("MYSQL_HOST", "127.0.0.1")

    get_settings.cache_clear()
    settings = get_settings()

    assert "?ssl_verify_cert=true" not in settings.database_url


def test_database_url_with_ssl(mock_env_vars, monkeypatch):
    monkeypatch.setenv("MYSQL_HOST", "prod-db")

    get_settings.cache_clear()
    settings = get_settings()

    expected_url = (
        "mysql+pymysql://test_user:test_password@prod-db:3306/test_db"
        "?ssl_verify_cert=true"
    )

    assert settings.database_url == expected_url


def test_get_engine_creates_engine(mock_env_vars):
    get_settings.cache_clear()
    get_engine.cache_clear()

    engine = get_engine()

    assert engine is not None
    assert "mysql+pymysql://" in str(engine.url)
