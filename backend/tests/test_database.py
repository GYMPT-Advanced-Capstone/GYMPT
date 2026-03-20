from unittest.mock import MagicMock, patch

import pytest


@pytest.fixture(autouse=True)
def mock_env_vars(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("MYSQL_HOST", "localhost")
    monkeypatch.setenv("MYSQL_PORT", "3306")
    monkeypatch.setenv("MYSQL_USER", "test_user")
    monkeypatch.setenv("MYSQL_PASSWORD", "test_password")
    monkeypatch.setenv("MYSQL_DATABASE", "test_db")


def test_database_url_format(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("MYSQL_HOST", "testhost")
    monkeypatch.setenv("MYSQL_PORT", "3306")
    monkeypatch.setenv("MYSQL_USER", "testuser")
    monkeypatch.setenv("MYSQL_PASSWORD", "testpass")
    monkeypatch.setenv("MYSQL_DATABASE", "testdb")

    from app.core.config import Settings

    test_settings = Settings()
    database_url = test_settings.database_url

    assert database_url.startswith("mysql+pymysql://")
    assert "testhost" in database_url
    assert "testdb" in database_url


def test_get_db_yields_session() -> None:
    with patch("app.core.database.SessionLocal") as mock_session_local:
        fake_db = MagicMock()
        mock_session_local.return_value = fake_db

        from app.core.database import get_db

        gen = get_db()
        db = next(gen)

        assert db is fake_db
        mock_session_local.assert_called_once()

        gen.close()
        fake_db.close.assert_called_once()
