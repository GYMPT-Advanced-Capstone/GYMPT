from sqlalchemy import text
from app.core.database import SessionLocal

def test_db_connection():
    db = SessionLocal()
    try:
        result = db.execute(text("SELECT 1"))
        print("DB 연결 성공:", result.scalar())
    except Exception as e:
        print("DB 연결 실패:", e)
    finally:
        db.close()


if __name__ == "__main__":
    test_db_connection()