from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser, get_business_id, require_permission
from app.core.exceptions import not_found
from app.core.permissions import Permission
from app.db.session import get_db
from app.models.ticket import RepairTicket, TicketInternalNote, TicketTimeline
from app.models.customer import Customer
from app.models.business import User
from app.schemas.common import PaginatedResponse
from app.schemas.communications import CommunicationResponse, TicketEmailSend, TicketSmsSend
from app.schemas.ticket import (
    InternalNoteCreate,
    InternalNoteResponse,
    TicketCreate,
    TicketResponse,
    TicketStatusUpdate,
    TicketUpdate,
    TimelineEntry,
)
from app.services.ticket_service import generate_ticket_number, transition_status
from app.services.communication_service import (
    STATUS_EVENT_MAP,
    render_template,
    send_automation,
    send_ticket_email,
    send_ticket_sms,
    ticket_context,
)
from app.models.ticket import TicketCommunication

router = APIRouter(prefix="/tickets", tags=["Repair Tickets"])

IN_PROGRESS = {"diagnosing", "waiting_approval", "waiting_parts", "repairing", "testing"}


@router.get("", response_model=PaginatedResponse[TicketResponse])
async def list_tickets(
    status: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    business_id: UUID = Depends(get_business_id),
    _: CurrentUser = Depends(require_permission(Permission.TICKETS_READ)),
    db: AsyncSession = Depends(get_db),
):
    base = select(RepairTicket).where(RepairTicket.business_id == business_id)
    if status:
        base = base.where(RepairTicket.status == status)
    total_result = await db.execute(select(func.count()).select_from(base.subquery()))
    total = total_result.scalar() or 0
    result = await db.execute(
        base.order_by(RepairTicket.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    )
    items = [TicketResponse.model_validate(t) for t in result.scalars().all()]
    pages = max(1, (total + page_size - 1) // page_size)
    return PaginatedResponse(items=items, total=total, page=page, page_size=page_size, pages=pages)


@router.post("", response_model=TicketResponse, status_code=201)
async def create_ticket(
    body: TicketCreate,
    user: CurrentUser = Depends(require_permission(Permission.TICKETS_WRITE)),
    business_id: UUID = Depends(get_business_id),
    db: AsyncSession = Depends(get_db),
):
    ticket_number = await generate_ticket_number(db, business_id)
    ticket = RepairTicket(
        business_id=business_id,
        ticket_number=ticket_number,
        created_by_id=user.id,
        **body.model_dump(),
    )
    db.add(ticket)
    await db.flush()
    timeline = TicketTimeline(
        ticket_id=ticket.id,
        from_status=None,
        to_status="new",
        note="Ticket created",
        created_by_id=user.id,
        is_customer_visible=True,
    )
    db.add(timeline)
    await send_automation(db, ticket, "ticket_created", user.id)
    await db.refresh(ticket)
    return TicketResponse.model_validate(ticket)


@router.get("/{ticket_id}", response_model=TicketResponse)
async def get_ticket(
    ticket_id: UUID,
    business_id: UUID = Depends(get_business_id),
    _: CurrentUser = Depends(require_permission(Permission.TICKETS_READ)),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(RepairTicket).where(RepairTicket.id == ticket_id, RepairTicket.business_id == business_id)
    )
    ticket = result.scalar_one_or_none()
    if not ticket:
        raise not_found("Ticket")
    return TicketResponse.model_validate(ticket)


@router.patch("/{ticket_id}", response_model=TicketResponse)
async def update_ticket(
    ticket_id: UUID,
    body: TicketUpdate,
    business_id: UUID = Depends(get_business_id),
    _: CurrentUser = Depends(require_permission(Permission.TICKETS_WRITE)),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(RepairTicket).where(RepairTicket.id == ticket_id, RepairTicket.business_id == business_id)
    )
    ticket = result.scalar_one_or_none()
    if not ticket:
        raise not_found("Ticket")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(ticket, k, v)
    await db.flush()
    return TicketResponse.model_validate(ticket)


@router.post("/{ticket_id}/status", response_model=TicketResponse)
async def update_status(
    ticket_id: UUID,
    body: TicketStatusUpdate,
    user: CurrentUser = Depends(require_permission(Permission.TICKETS_WRITE)),
    business_id: UUID = Depends(get_business_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(RepairTicket).where(RepairTicket.id == ticket_id, RepairTicket.business_id == business_id)
    )
    ticket = result.scalar_one_or_none()
    if not ticket:
        raise not_found("Ticket")
    await transition_status(
        db,
        ticket,
        body.status,
        user_id=user.id,
        note=body.note,
        customer_visible=body.customer_visible,
    )
    event_key = STATUS_EVENT_MAP.get(body.status)
    if event_key:
        await send_automation(db, ticket, event_key, user.id)
    await db.flush()
    return TicketResponse.model_validate(ticket)


@router.get("/{ticket_id}/timeline", response_model=list[TimelineEntry])
async def get_timeline(
    ticket_id: UUID,
    business_id: UUID = Depends(get_business_id),
    _: CurrentUser = Depends(require_permission(Permission.TICKETS_READ)),
    db: AsyncSession = Depends(get_db),
):
    ticket_check = await db.execute(
        select(RepairTicket.id).where(RepairTicket.id == ticket_id, RepairTicket.business_id == business_id)
    )
    if not ticket_check.scalar_one_or_none():
        raise not_found("Ticket")
    result = await db.execute(
        select(TicketTimeline)
        .where(TicketTimeline.ticket_id == ticket_id)
        .order_by(TicketTimeline.created_at)
    )
    return [TimelineEntry.model_validate(e) for e in result.scalars().all()]


@router.get("/{ticket_id}/notes", response_model=list[InternalNoteResponse])
async def list_internal_notes(
    ticket_id: UUID,
    business_id: UUID = Depends(get_business_id),
    _: CurrentUser = Depends(require_permission(Permission.TICKETS_READ)),
    db: AsyncSession = Depends(get_db),
):
    ticket_check = await db.execute(
        select(RepairTicket.id).where(RepairTicket.id == ticket_id, RepairTicket.business_id == business_id)
    )
    if not ticket_check.scalar_one_or_none():
        raise not_found("Ticket")
    result = await db.execute(
        select(TicketInternalNote, User.full_name)
        .join(User, User.id == TicketInternalNote.author_id)
        .where(TicketInternalNote.ticket_id == ticket_id)
        .order_by(TicketInternalNote.created_at)
    )
    return [
        InternalNoteResponse(
            id=note.id,
            ticket_id=note.ticket_id,
            author_id=note.author_id,
            author_name=author_name,
            body=note.body,
            created_at=note.created_at,
        )
        for note, author_name in result.all()
    ]


@router.post("/{ticket_id}/notes", response_model=InternalNoteResponse, status_code=201)
async def create_internal_note(
    ticket_id: UUID,
    body: InternalNoteCreate,
    user: CurrentUser = Depends(require_permission(Permission.TICKETS_WRITE)),
    business_id: UUID = Depends(get_business_id),
    db: AsyncSession = Depends(get_db),
):
    ticket = await db.scalar(
        select(RepairTicket).where(RepairTicket.id == ticket_id, RepairTicket.business_id == business_id)
    )
    if not ticket:
        raise not_found("Ticket")
    note = TicketInternalNote(
        ticket_id=ticket.id,
        author_id=user.id,
        body=body.body.strip(),
    )
    db.add(note)
    await db.flush()
    await db.refresh(note)
    return InternalNoteResponse(
        id=note.id,
        ticket_id=note.ticket_id,
        author_id=note.author_id,
        author_name=user.full_name,
        body=note.body,
        created_at=note.created_at,
    )


@router.get("/{ticket_id}/communications", response_model=list[CommunicationResponse])
async def get_communications(
    ticket_id: UUID,
    business_id: UUID = Depends(get_business_id),
    _: CurrentUser = Depends(require_permission(Permission.TICKETS_READ)),
    db: AsyncSession = Depends(get_db),
):
    ticket_check = await db.scalar(
        select(RepairTicket.id).where(RepairTicket.id == ticket_id, RepairTicket.business_id == business_id)
    )
    if not ticket_check:
        raise not_found("Ticket")
    result = await db.execute(
        select(TicketCommunication)
        .where(TicketCommunication.ticket_id == ticket_id, TicketCommunication.business_id == business_id)
        .order_by(TicketCommunication.created_at)
    )
    return [CommunicationResponse.model_validate(c) for c in result.scalars().all()]


@router.post("/{ticket_id}/communications/email", response_model=CommunicationResponse, status_code=201)
async def send_email_from_ticket(
    ticket_id: UUID,
    body: TicketEmailSend,
    user: CurrentUser = Depends(require_permission(Permission.TICKETS_WRITE)),
    business_id: UUID = Depends(get_business_id),
    db: AsyncSession = Depends(get_db),
):
    ticket = await db.scalar(
        select(RepairTicket).where(RepairTicket.id == ticket_id, RepairTicket.business_id == business_id)
    )
    if not ticket:
        raise not_found("Ticket")
    comm = await send_ticket_email(
        db,
        ticket,
        to=body.to,
        subject=body.subject,
        body_html=body.body_html,
        body_text=body.body_text,
        attachments=[a.model_dump() for a in body.attachments],
        user_id=user.id,
    )
    return CommunicationResponse.model_validate(comm)


@router.post("/{ticket_id}/communications/sms", response_model=CommunicationResponse, status_code=201)
async def send_sms_from_ticket(
    ticket_id: UUID,
    body: TicketSmsSend,
    user: CurrentUser = Depends(require_permission(Permission.TICKETS_WRITE)),
    business_id: UUID = Depends(get_business_id),
    db: AsyncSession = Depends(get_db),
):
    ticket = await db.scalar(
        select(RepairTicket).where(RepairTicket.id == ticket_id, RepairTicket.business_id == business_id)
    )
    if not ticket:
        raise not_found("Ticket")
    comm = await send_ticket_sms(db, ticket, to=body.to, message=body.message, user_id=user.id)
    return CommunicationResponse.model_validate(comm)


@router.get("/{ticket_id}/communications/template/{event_key}")
async def get_ticket_template(
    ticket_id: UUID,
    event_key: str,
    business_id: UUID = Depends(get_business_id),
    _: CurrentUser = Depends(require_permission(Permission.TICKETS_READ)),
    db: AsyncSession = Depends(get_db),
):
    ticket = await db.scalar(
        select(RepairTicket).where(RepairTicket.id == ticket_id, RepairTicket.business_id == business_id)
    )
    if not ticket:
        raise not_found("Ticket")
    context = await ticket_context(db, ticket)
    subject, html = render_template(event_key, context)
    return {"subject": subject, "body_html": html}
