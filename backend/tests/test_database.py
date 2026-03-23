from unittest.mock import patch, MagicMock

from app.core.config import get_settings
from app.core.database import get_engine, get_session_local, get_db


def test_database_url_format(mock_env_vars):
    get_settings.cache_clear()

    settings = get_settings()

    expected_url = (
        "mysql+pymysql://test_user:test_password"
        "@localhost:3306/test_db"
        "?ssl_verify_cert=true"
    )

    assert settings.database_url == expected_url


def test_database_engine_uses_config_url(mock_env_vars):
    get_settings.cache_clear()
    get_engine.cache_clear()

    with patch("app.core.database.create_engine") as mock_create_engine:
        get_engine()

        args, kwargs = mock_create_engine.call_args

        expected_url = (
            "mysql+pymysql://test_user:test_password"
            "@localhost:3306/test_db"
            "?ssl_verify_cert=true"
        )

        assert args[0] == expected_url

        assert kwargs["pool_pre_ping"] is True
        assert kwargs["pool_recycle"] == 3600


def test_get_session_local(mock_env_vars):
    get_settings.cache_clear()
    get_engine.cache_clear()

    with patch("app.core.database.get_engine") as mock_get_engine:
        mock_engine = MagicMock()
        mock_get_engine.return_value = mock_engine

        SessionLocal = get_session_local()

        assert SessionLocal is not None


def test_get_db(mock_env_vars):
    get_settings.cache_clear()

    mock_session = MagicMock()
    mock_sessionmaker = MagicMock(return_value=mock_session)

    with patch("app.core.database.get_session_local", return_value=mock_sessionmaker):
        gen = get_db()

        db = next(gen)
        assert db == mock_session

        try:
            next(gen)
        except StopIteration:
            pass

        mock_session.close.assert_called_once()
