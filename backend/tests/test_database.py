from app.core.config import get_settings


def test_database_url_format(mock_env_vars):
    get_settings.cache_clear()
    settings = get_settings()

    expected_url = "mysql+pymysql://test_user:test_password@localhost:3306/test_db"

    assert settings.database_url == expected_url
