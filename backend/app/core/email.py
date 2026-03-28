import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from fastapi import HTTPException, status

from app.core.config import get_settings

logger = logging.getLogger(__name__)


def send_verification_email(
    to_email: str, code: str, subject: str, purpose: str
) -> None:
    settings = get_settings()

    msg = MIMEMultipart()
    msg["From"] = settings.MAIL_FROM
    msg["To"] = to_email
    msg["Subject"] = subject

    body = (
        f"안녕하세요, GYMPT입니다.\n\n"
        f"{purpose} 인증 코드: {code}\n\n"
        f"이 코드는 {settings.VERIFICATION_CODE_EXPIRE_MINUTES}분 후 만료됩니다.\n"
        f"본인이 요청하지 않은 경우 이 이메일을 무시해주세요."
    )
    msg.attach(MIMEText(body, "plain", "utf-8"))

    try:
        with smtplib.SMTP(
            settings.MAIL_SERVER, settings.MAIL_PORT, timeout=10
        ) as server:
            server.starttls()
            server.login(settings.MAIL_USERNAME, settings.MAIL_PASSWORD)
            server.sendmail(settings.MAIL_FROM, to_email, msg.as_string())
    except (smtplib.SMTPException, OSError) as e:
        logger.error(f"이메일 발송 실패: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="이메일 발송에 실패했습니다. 잠시 후 다시 시도해주세요.",
        )
