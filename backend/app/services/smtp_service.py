"""Shared SMTP client with STARTTLS and implicit SSL support."""
from __future__ import annotations

import smtplib
import ssl
from email.message import EmailMessage
from typing import Any, Literal

SecurityMode = Literal["ssl", "starttls", "none"]


def resolve_smtp_security(config: dict[str, Any]) -> SecurityMode:
    explicit = config.get("security")
    if explicit in ("ssl", "starttls", "none"):
        return explicit

    port = int(config.get("port") or 587)
    if config.get("ssl_enabled") is True:
        return "ssl"
    if port == 465:
        return "ssl"
    if config.get("tls_enabled", True) and port != 25:
        return "starttls"
    return "none"


def security_mode_label(mode: SecurityMode) -> str:
    return {"ssl": "SSL/TLS", "starttls": "STARTTLS", "none": "none"}[mode]


def send_email_message(config: dict[str, Any], msg: EmailMessage, *, timeout: int = 30) -> None:
    host = config.get("host")
    if not host:
        raise RuntimeError("SMTP host is not configured")

    port = int(config.get("port") or 587)
    security = resolve_smtp_security(config)
    username = config.get("username")
    password = config.get("password") or ""

    try:
        if security == "ssl":
            context = ssl.create_default_context()
            with smtplib.SMTP_SSL(host, port, timeout=timeout, context=context) as smtp:
                if username:
                    smtp.login(username, password)
                smtp.send_message(msg)
            return

        with smtplib.SMTP(host, port, timeout=timeout) as smtp:
            smtp.ehlo()
            if security == "starttls":
                context = ssl.create_default_context()
                smtp.starttls(context=context)
                smtp.ehlo()
            if username:
                smtp.login(username, password)
            smtp.send_message(msg)
    except TimeoutError as exc:
        raise RuntimeError(
            f"SMTP connection to {host}:{port} timed out ({security_mode_label(security)}). "
            "Verify the host and port, try SSL/TLS on port 465 or STARTTLS on port 587, "
            "and confirm your server allows outbound SMTP."
        ) from exc
    except smtplib.SMTPException as exc:
        raise RuntimeError(
            f"SMTP error using {security_mode_label(security)} on {host}:{port}: {exc}"
        ) from exc
    except OSError as exc:
        raise RuntimeError(f"Could not connect to SMTP server {host}:{port}: {exc}") from exc
