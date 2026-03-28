import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.core.config import get_settings


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
    msg.attach(MIMEText(body, "plain"))

    with smtplib.SMTP(settings.MAIL_SERVER, settings.MAIL_PORT) as server:
        server.starttls()
        server.login(settings.MAIL_USERNAME, settings.MAIL_PASSWORD)
        server.sendmail(settings.MAIL_FROM, to_email, msg.as_string())
