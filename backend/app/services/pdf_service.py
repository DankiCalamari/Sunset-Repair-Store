"""Branded PDF generation for quotes and invoices."""
from __future__ import annotations

import base64
import io
from dataclasses import dataclass, field
from datetime import date, datetime
from decimal import Decimal
from typing import Any

import httpx
from reportlab.lib import colors
from reportlab.lib.enums import TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Image, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
from reportlab.lib.utils import ImageReader

PAGE_WIDTH, PAGE_HEIGHT = A4
MARGIN = 18 * mm


@dataclass
class BrandingContext:
    business_name: str
    legal_name: str | None = None
    abn: str | None = None
    email: str | None = None
    phone: str | None = None
    address_line1: str | None = None
    city: str | None = None
    state: str | None = None
    postcode: str | None = None
    currency: str = "AUD"
    primary_color: str = "#1e3a5f"
    accent_color: str = "#d97706"
    footer_text: str = "Thank you for your business."
    logo_bytes: bytes | None = None


@dataclass
class DocumentLine:
    description: str
    quantity: Decimal
    unit_price: Decimal
    line_type: str | None = None

    @property
    def line_total(self) -> Decimal:
        return (self.quantity * self.unit_price).quantize(Decimal("0.01"))


@dataclass
class QuotePdfContext:
    quote_number: str
    status: str
    created_at: datetime
    valid_until: date | None
    customer_name: str
    customer_email: str | None
    customer_phone: str | None
    ticket_number: str | None
    lines: list[DocumentLine]
    subtotal: Decimal
    tax_amount: Decimal
    discount_amount: Decimal
    total: Decimal
    tax_rate: Decimal


@dataclass
class InvoicePdfContext:
    invoice_number: str
    status: str
    issued_at: datetime | None
    created_at: datetime
    customer_name: str
    customer_email: str | None
    customer_phone: str | None
    ticket_number: str | None
    lines: list[DocumentLine]
    subtotal: Decimal
    tax_amount: Decimal
    discount_amount: Decimal
    total: Decimal
    amount_paid: Decimal
    tax_rate: Decimal
    payments: list[dict[str, Any]] = field(default_factory=list)


def _hex_color(value: str | None, default: str = "#1e3a5f") -> colors.Color:
    raw = (value or default).strip()
    if raw.startswith("#"):
        raw = raw[1:]
    if len(raw) != 6:
        raw = default.lstrip("#")
    red = int(raw[0:2], 16) / 255
    green = int(raw[2:4], 16) / 255
    blue = int(raw[4:6], 16) / 255
    return colors.Color(red, green, blue)


def _format_money(amount: Decimal | float | str, currency: str = "AUD") -> str:
    value = Decimal(str(amount))
    symbol = "$" if currency == "AUD" else f"{currency} "
    return f"{symbol}{value:,.2f}"


def _format_date(value: date | datetime | None) -> str:
    if not value:
        return "—"
    if isinstance(value, datetime):
        value = value.date()
    return value.strftime("%d %b %Y")


def _business_address(branding: BrandingContext) -> str:
    parts = [p for p in [branding.address_line1, branding.city, branding.state, branding.postcode] if p]
    return ", ".join(parts)


def _business_contact(branding: BrandingContext) -> str:
    parts = []
    if branding.phone:
        parts.append(branding.phone)
    if branding.email:
        parts.append(branding.email)
    if branding.abn:
        parts.append(f"ABN {branding.abn}")
    return " · ".join(parts)


async def load_logo_bytes(branding: dict[str, Any]) -> bytes | None:
    data_url = branding.get("logo_data_url")
    if isinstance(data_url, str) and data_url.startswith("data:") and "," in data_url:
        try:
            return base64.b64decode(data_url.split(",", 1)[1])
        except Exception:
            pass

    logo_url = branding.get("logo_url")
    if isinstance(logo_url, str) and logo_url.strip():
        try:
            async with httpx.AsyncClient(timeout=10, follow_redirects=True) as client:
                response = await client.get(logo_url.strip())
                if response.status_code == 200 and response.content:
                    return response.content
        except Exception:
            pass
    return None


def branding_from_business(business: Any, settings: Any | None, logo_bytes: bytes | None = None) -> BrandingContext:
    branding = (settings.branding_json if settings else {}) or {}
    if not isinstance(branding, dict):
        branding = {}
    return BrandingContext(
        business_name=business.name,
        legal_name=business.legal_name,
        abn=business.abn,
        email=business.email,
        phone=business.phone,
        address_line1=business.address_line1,
        city=business.city,
        state=business.state,
        postcode=business.postcode,
        currency=business.currency or "AUD",
        primary_color=str(branding.get("primary_color") or "#1e3a5f"),
        accent_color=str(branding.get("accent_color") or "#d97706"),
        footer_text=str(branding.get("footer_text") or "Thank you for your business."),
        logo_bytes=logo_bytes,
    )


def _styles(branding: BrandingContext) -> dict[str, ParagraphStyle]:
    base = getSampleStyleSheet()
    primary = _hex_color(branding.primary_color)
    muted = colors.HexColor("#64748b")
    return {
        "title": ParagraphStyle(
            "DocTitle",
            parent=base["Heading1"],
            fontName="Helvetica-Bold",
            fontSize=20,
            textColor=primary,
            spaceAfter=4,
        ),
        "subtitle": ParagraphStyle(
            "DocSubtitle",
            parent=base["Normal"],
            fontSize=10,
            textColor=muted,
            spaceAfter=2,
        ),
        "label": ParagraphStyle(
            "DocLabel",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=9,
            textColor=muted,
            spaceAfter=2,
        ),
        "body": ParagraphStyle(
            "DocBody",
            parent=base["Normal"],
            fontSize=10,
            textColor=colors.HexColor("#0f172a"),
            leading=14,
        ),
        "footer": ParagraphStyle(
            "DocFooter",
            parent=base["Normal"],
            fontSize=9,
            textColor=muted,
            alignment=TA_RIGHT,
        ),
    }


def _header_elements(branding: BrandingContext, styles: dict[str, ParagraphStyle]) -> list[Any]:
    primary = _hex_color(branding.primary_color)
    accent = _hex_color(branding.accent_color)
    display_name = branding.legal_name or branding.business_name

    logo_cell: Any
    if branding.logo_bytes:
        try:
            img = Image(ImageReader(io.BytesIO(branding.logo_bytes)), width=42 * mm, height=18 * mm, kind="proportional")
            logo_cell = img
        except Exception:
            logo_cell = Paragraph(f"<b>{display_name}</b>", styles["title"])
    else:
        logo_cell = Paragraph(f"<b>{display_name}</b>", styles["title"])

    address = _business_address(branding)
    contact = _business_contact(branding)
    right_lines = [f"<b>{display_name}</b>"]
    if address:
        right_lines.append(address)
    if contact:
        right_lines.append(contact)

    header_table = Table(
        [[logo_cell, Paragraph("<br/>".join(right_lines), styles["body"])]],
        colWidths=[55 * mm, PAGE_WIDTH - 2 * MARGIN - 55 * mm],
    )
    header_table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("ALIGN", (1, 0), (1, 0), "RIGHT"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
            ]
        )
    )

    accent_bar = Table([[""]], colWidths=[PAGE_WIDTH - 2 * MARGIN], rowHeights=[2.5 * mm])
    accent_bar.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), accent),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ]
        )
    )

    divider = Table([[""]], colWidths=[PAGE_WIDTH - 2 * MARGIN], rowHeights=[0.4 * mm])
    divider.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), primary)]))

    return [header_table, Spacer(1, 4 * mm), accent_bar, Spacer(1, 2 * mm), divider, Spacer(1, 8 * mm)]


def _meta_block(title: str, rows: list[tuple[str, str]], styles: dict[str, ParagraphStyle]) -> Table:
    data = [[Paragraph(f"<b>{title}</b>", styles["label"]), ""]]
    for label, value in rows:
        data.append([Paragraph(label, styles["subtitle"]), Paragraph(value, styles["body"])])
    table = Table(data, colWidths=[28 * mm, 62 * mm])
    table.setStyle(
        TableStyle(
            [
                ("SPAN", (0, 0), (1, 0)),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ]
        )
    )
    return table


def _lines_table(lines: list[DocumentLine], currency: str, accent: colors.Color) -> Table:
    header = ["Item", "Qty", "Unit price", "Amount"]
    rows: list[list[Any]] = [header]
    for line in lines:
        prefix = f"[{line.line_type}] " if line.line_type else ""
        rows.append(
            [
                f"{prefix}{line.description}",
                f"{line.quantity:.2f}".rstrip("0").rstrip(".") if line.quantity % 1 else str(int(line.quantity)),
                _format_money(line.unit_price, currency),
                _format_money(line.line_total, currency),
            ]
        )

    table = Table(rows, colWidths=[88 * mm, 18 * mm, 28 * mm, 28 * mm], repeatRows=1)
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), accent),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
                ("ALIGN", (0, 0), (0, -1), "LEFT"),
                ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#e2e8f0")),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    return table


def _totals_table(
    subtotal: Decimal,
    discount: Decimal,
    tax_amount: Decimal,
    total: Decimal,
    tax_rate: Decimal,
    currency: str,
    *,
    amount_paid: Decimal | None = None,
    balance_due: Decimal | None = None,
) -> Table:
    rows = [
        ["Subtotal", _format_money(subtotal, currency)],
        [f"GST ({tax_rate * 100:.0f}%)", _format_money(tax_amount, currency)],
    ]
    if discount > 0:
        rows.insert(1, ["Discount", f"-{_format_money(discount, currency)[1:]}"])
    rows.append(["Total", _format_money(total, currency)])
    if amount_paid is not None:
        rows.append(["Amount paid", _format_money(amount_paid, currency)])
    if balance_due is not None:
        rows.append(["Balance due", _format_money(balance_due, currency)])

    table = Table(rows, colWidths=[40 * mm, 32 * mm], hAlign="RIGHT")
    table.setStyle(
        TableStyle(
            [
                ("ALIGN", (0, 0), (-1, -1), "RIGHT"),
                ("FONTNAME", (0, -1 if balance_due is None else -2), (-1, -1 if balance_due is None else -2), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 10),
                ("LINEABOVE", (0, -1 if balance_due is None else -2), (-1, -1 if balance_due is None else -2), 0.75, colors.HexColor("#cbd5e1")),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    return table


def _build_pdf(title: str, story: list[Any]) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=MARGIN,
        rightMargin=MARGIN,
        topMargin=MARGIN,
        bottomMargin=MARGIN,
        title=title,
    )
    doc.build(story)
    return buffer.getvalue()


def render_quote_pdf(branding: BrandingContext, quote: QuotePdfContext) -> bytes:
    styles = _styles(branding)
    accent = _hex_color(branding.accent_color)
    story = _header_elements(branding, styles)
    story.append(Paragraph("QUOTATION", styles["title"]))
    story.append(Spacer(1, 4 * mm))

    doc_meta = _meta_block(
        "Quote details",
        [
            ("Quote #", quote.quote_number),
            ("Date", _format_date(quote.created_at)),
            ("Valid until", _format_date(quote.valid_until)),
            ("Status", quote.status.replace("_", " ").title()),
        ],
        styles,
    )
    customer_meta = _meta_block(
        "Customer",
        [
            ("Name", quote.customer_name),
            ("Email", quote.customer_email or "—"),
            ("Phone", quote.customer_phone or "—"),
            ("Ticket", quote.ticket_number or "—"),
        ],
        styles,
    )
    story.append(Table([[doc_meta, customer_meta]], colWidths=[95 * mm, 95 * mm]))
    story.append(Spacer(1, 8 * mm))
    story.append(_lines_table(quote.lines, branding.currency, accent))
    story.append(Spacer(1, 6 * mm))
    story.append(_totals_table(quote.subtotal, quote.discount_amount, quote.tax_amount, quote.total, quote.tax_rate, branding.currency))
    story.append(Spacer(1, 10 * mm))
    story.append(Paragraph(branding.footer_text, styles["footer"]))
    return _build_pdf(f"Quote {quote.quote_number}", story)


def render_invoice_pdf(branding: BrandingContext, invoice: InvoicePdfContext) -> bytes:
    styles = _styles(branding)
    accent = _hex_color(branding.accent_color)
    story = _header_elements(branding, styles)
    story.append(Paragraph("TAX INVOICE", styles["title"]))
    story.append(Spacer(1, 4 * mm))

    doc_meta = _meta_block(
        "Invoice details",
        [
            ("Invoice #", invoice.invoice_number),
            ("Issued", _format_date(invoice.issued_at or invoice.created_at)),
            ("Status", invoice.status.replace("_", " ").title()),
            ("Ticket", invoice.ticket_number or "—"),
        ],
        styles,
    )
    customer_meta = _meta_block(
        "Bill to",
        [
            ("Name", invoice.customer_name),
            ("Email", invoice.customer_email or "—"),
            ("Phone", invoice.customer_phone or "—"),
        ],
        styles,
    )
    story.append(Table([[doc_meta, customer_meta]], colWidths=[95 * mm, 95 * mm]))
    story.append(Spacer(1, 8 * mm))
    story.append(_lines_table(invoice.lines, branding.currency, accent))
    story.append(Spacer(1, 6 * mm))

    balance = max(invoice.total - invoice.amount_paid, Decimal("0"))
    story.append(
        _totals_table(
            invoice.subtotal,
            invoice.discount_amount,
            invoice.tax_amount,
            invoice.total,
            invoice.tax_rate,
            branding.currency,
            amount_paid=invoice.amount_paid,
            balance_due=balance if balance > 0 else Decimal("0"),
        )
    )

    if invoice.payments:
        story.append(Spacer(1, 8 * mm))
        story.append(Paragraph("<b>Payment history</b>", styles["label"]))
        payment_rows = [["Date", "Method", "Reference", "Amount"]]
        for payment in invoice.payments:
            payment_rows.append(
                [
                    _format_date(payment.get("paid_at")),
                    str(payment.get("method", "")).replace("_", " ").title(),
                    payment.get("reference") or "—",
                    _format_money(payment.get("amount", 0), branding.currency),
                ]
            )
        payments_table = Table(payment_rows, colWidths=[32 * mm, 28 * mm, 50 * mm, 28 * mm], repeatRows=1)
        payments_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), accent),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, -1), 9),
                    ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#e2e8f0")),
                    ("ALIGN", (-1, 0), (-1, -1), "RIGHT"),
                    ("TOPPADDING", (0, 0), (-1, -1), 5),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                ]
            )
        )
        story.append(payments_table)

    story.append(Spacer(1, 10 * mm))
    story.append(Paragraph(branding.footer_text, styles["footer"]))
    return _build_pdf(f"Invoice {invoice.invoice_number}", story)
