from unittest.mock import MagicMock, patch

from app.core.config import settings
from app.core.database import get_db


def test_database_url_exists() -> None:
    database_url = settings.database_url

    assert database_url.startswith("mysql+pymysql://")
    assert settings.MYSQL_HOST in database_url
    assert settings.MYSQL_DATABASE in database_url


@patch("app.core.database.SessionLocal")
def test_session_local_exists(mock_session_local: MagicMock) -> None:
    fake_db = MagicMock()
    mock_session_local.return_value = fake_db

    db = mock_session_local()

    assert db is not None
    mock_session_local.assert_called_once()


@patch("app.core.database.SessionLocal")
def test_get_db_yields_session(mock_session_local: MagicMock) -> None:
    fake_db = MagicMock()
    mock_session_local.return_value = fake_db

    gen = get_db()
    db = next(gen)

    assert db is fake_db
    mock_session_local.assert_called_once()

    gen.close()
    fake_db.close.assert_called_once()
