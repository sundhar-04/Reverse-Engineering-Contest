from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.core.websocket import manager
from app.services.leaderboard_service import get_leaderboard
from app.core.database import get_database

router = APIRouter()


@router.websocket("/ws/contests/{contest_id}/leaderboard")
async def leaderboard_websocket(websocket: WebSocket, contest_id: str):
    await manager.connect(websocket, contest_id)
    try:
        # Send initial leaderboard
        db = get_database()
        leaderboard = await get_leaderboard(contest_id, db)
        await manager.send_personal(websocket, {
            "type": "leaderboard_init",
            "data": leaderboard
        })
        
        # Keep connection alive and handle ping/pong
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_json({"type": "pong"})
    except WebSocketDisconnect:
        manager.disconnect(websocket)