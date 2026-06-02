"""Shared IMAP client with SSL and STARTTLS support."""
from __future__ import annotations

import imaplib
import ssl
from typing import Any, Literal

from app.services.smtp_service import security_mode_label

ImapSecurityMode = Literal["ssl", "starttls", "none"]


def resolve_imap_security(config: dict[str, Any]) -> ImapSecurityMode:
    explicit = config.get("security")
    if explicit in ("ssl", "starttls", "none"):
        return explicit

    port = int(config.get("port") or 993)
    if config.get("ssl_enabled") is True:
        return "ssl"
    if config.get("tls_enabled") is True:
        return "starttls"
    if port == 993:
        return "ssl"
    if port == 143:
        return "starttls"
    return "none"


def open_imap_connection(config: dict[str, Any], *, timeout: int = 30) -> imaplib.IMAP4:
    host = config.get("host")
    if not host:
        raise RuntimeError("IMAP host is not configured")

    port = int(config.get("port") or 993)
    security = resolve_imap_security(config)
    context = ssl.create_default_context()

    try:
        if security == "ssl":
            return imaplib.IMAP4_SSL(host, port, ssl_context=context, timeout=timeout)

        conn = imaplib.IMAP4(host, port, timeout=timeout)
        if security == "starttls":
            conn.starttls(ssl_context=context)
        return conn
    except TimeoutError as exc:
        raise RuntimeError(
            f"IMAP connection to {host}:{port} timed out ({security_mode_label(security)}). "
            "Verify the host and port, try SSL/TLS on port 993 or STARTTLS on port 143."
        ) from exc
    except imaplib.IMAP4.error as exc:
        raise RuntimeError(
            f"IMAP error using {security_mode_label(security)} on {host}:{port}: {exc}"
        ) from exc
    except OSError as exc:
        raise RuntimeError(f"Could not connect to IMAP server {host}:{port}: {exc}") from exc


def test_imap_connection(config: dict[str, Any], *, timeout: int = 30) -> str:
    username = config.get("username")
    password = config.get("password")
    if not username or not password:
        raise RuntimeError("IMAP username and password are required")

    mailbox = config.get("mailbox") or "INBOX"
    host = config.get("host")
    port = int(config.get("port") or 993)
    security = resolve_imap_security(config)

    conn = open_imap_connection(config, timeout=timeout)
    try:
        conn.login(username, password)
        status, _ = conn.select(mailbox, readonly=True)
        if status != "OK":
            raise RuntimeError(f"Could not open mailbox {mailbox}")

        status, data = conn.search(None, "ALL")
        total = len(data[0].split()) if status == "OK" and data[0] else 0
        return (
            f"Connected to {mailbox} on {host}:{port} "
            f"({security_mode_label(security)}). {total} message(s) in mailbox."
        )
    except imaplib.IMAP4.error as exc:
        raise RuntimeError(f"IMAP login or mailbox error: {exc}") from exc
    finally:
        try:
            conn.logout()
        except Exception:
            pass
