import logging
import secrets
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.services.smtp_service import send_email_message

logger = logging.getLogger(__name__)
settings = get_settings()

VERIFICATION_CODE_TTL_MINUTES = 15
VERIFICATION_CODE_LENGTH = 6


def _smtp_config() -> dict[str, Any]:
    username = settings.smtp_username or settings.smtp_user
    from_email = settings.smtp_from_email or settings.smtp_from or username or "no-reply@localhost"

    return {
        "host": settings.smtp_host,
        "port": settings.smtp_port,
        "username": username,
        "password": settings.smtp_password,
        "from_email": from_email,
        "tls_enabled": settings.smtp_tls,
        "ssl_enabled": settings.smtp_use_ssl,
    }


def _is_smtp_configured() -> bool:
    return bool(settings.smtp_host)


def _send_email(recipient: str, subject: str, body_html: str, body_text: str) -> None:
    config = _smtp_config()
    host = config["host"]
    if not host:
        raise RuntimeError("SMTP host is not configured")

    msg = EmailMessage()
    msg["From"] = config["from_email"]
    msg["To"] = recipient
    msg["Subject"] = subject
    msg.set_content(body_text)
    msg.add_alternative(body_html, subtype="html")

    send_email_message(config, msg)


async def ensure_setup_schema(db: AsyncSession) -> None:
    await db.execute(
        text(
            """
            CREATE TABLE IF NOT EXISTS setup_verification_codes (
              id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
              email VARCHAR(255) NOT NULL,
              code VARCHAR(20) NOT NULL,
              used BOOLEAN NOT NULL DEFAULT FALSE,
              created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
              expires_at TIMESTAMPTZ NOT NULL
            )
            """
        )
    )
    await db.execute(text("CREATE INDEX IF NOT EXISTS idx_setup_verification_email ON setup_verification_codes(email, expires_at, used)"))


def _generate_code() -> str:
    return "".join(secrets.choice("0123456789") for _ in range(VERIFICATION_CODE_LENGTH))


async def create_setup_verification_code(db: AsyncSession, email: str) -> str:
    code = _generate_code()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=VERIFICATION_CODE_TTL_MINUTES)
    await db.execute(
        text(
            "INSERT INTO setup_verification_codes (email, code, expires_at) VALUES (:email, :code, :expires_at)"
        ),
        {"email": email, "code": code, "expires_at": expires_at},
    )
    await db.commit()
    return code


async def mark_setup_code_used(db: AsyncSession, email: str, code: str) -> None:
    await db.execute(
        text(
            "UPDATE setup_verification_codes SET used = true WHERE email = :email AND code = :code AND used = false"
        ),
        {"email": email, "code": code},
    )
    await db.commit()


async def validate_setup_verification_code(db: AsyncSession, email: str, code: str) -> None:
    now = datetime.now(timezone.utc)
    result = await db.execute(
        text(
            "SELECT 1 FROM setup_verification_codes "
            "WHERE email = :email AND code = :code AND used = false "
            "AND expires_at >= :now LIMIT 1"
        ),
        {"email": email, "code": code, "now": now},
    )
    if result.scalar() is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"detail": "Invalid or expired verification code.", "code": "INVALID_VERIFICATION_CODE"},
        )

    await mark_setup_code_used(db, email, code)


async def send_setup_verification_code(db: AsyncSession, email: str) -> dict[str, str | bool | None]:
    code = await create_setup_verification_code(db, email)
    if _is_smtp_configured():
        try:
            subject = "Your verification code"
            body_html = f"<p>Your setup verification code is <strong>{code}</strong>.</p><p>Enter this code on the setup page to complete registration.</p>"
            body_text = f"Your setup verification code is {code}."
            _send_email(email, subject, body_html, body_text)
            return {"code_sent": True, "debug_code": None}
        except Exception as exc:
            logger.exception("SMTP send failed for verification code")
            if settings.app_debug:
                return {
                    "code_sent": True,
                    "debug_code": code,
                }
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail={"detail": "Failed to send verification email.", "code": "EMAIL_SEND_FAILED"},
            )

    return {"code_sent": True, "debug_code": code}
