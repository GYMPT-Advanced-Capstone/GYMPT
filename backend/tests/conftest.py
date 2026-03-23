import pytest
from unittest.mock import MagicMock


@pytest.fixture
def mock_env_vars(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("MYSQL_HOST", "localhost")
    monkeypatch.setenv("MYSQL_PORT", "3306")
    monkeypatch.setenv("MYSQL_USER", "test_user")
    monkeypatch.setenv("MYSQL_PASSWORD", "test_password")
    monkeypatch.setenv("MYSQL_DATABASE", "test_db")
    monkeypatch.setenv("SECRET_KEY", "test_secret_key_for_testing_only")
    monkeypatch.setenv("ALGORITHM", "HS256")


@pytest.fixture(autouse=True)
def mock_redis_client(monkeypatch: pytest.MonkeyPatch):
    mock_redis = MagicMock()
    mock_redis.get.return_value = None
    monkeypatch.setattr("app.auth.utils.get_redis_client", lambda: mock_redis)
