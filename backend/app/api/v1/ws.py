import json
from typing import Any

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.core.security import safe_decode_token

router = APIRouter(tags=["WebSocket"])

connections: dict[str, list[WebSocket]] = {}


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str | None = None):
    await websocket.accept()
    if not token:
        await websocket.close(code=4001)
        return
    payload = safe_decode_token(token)
    if not payload or payload.get("type") != "access":
        await websocket.close(code=4001)
        return

    business_id = payload.get("business_id") or "global"
    channel = f"dashboard.{business_id}"
    connections.setdefault(channel, []).append(websocket)

    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        connections[channel].remove(websocket)


async def broadcast(channel: str, event: str, payload: dict[str, Any]) -> None:
    message = json.dumps({"event": event, "payload": payload})
    for ws in connections.get(channel, []):
        try:
            await ws.send_text(message)
        except Exception:
            pass
