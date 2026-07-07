from fastapi import WebSocket
from typing import Dict, Set
import json


class ConnectionManager:
    def __init__(self):
        self.contest_rooms: Dict[str, Set[WebSocket]] = {}
        self.socket_to_contest: Dict[WebSocket, str] = {}
    
    async def connect(self, websocket: WebSocket, contest_id: str):
        await websocket.accept()
        if contest_id not in self.contest_rooms:
            self.contest_rooms[contest_id] = set()
        self.contest_rooms[contest_id].add(websocket)
        self.socket_to_contest[websocket] = contest_id
    
    def disconnect(self, websocket: WebSocket):
        contest_id = self.socket_to_contest.get(websocket)
        if contest_id and contest_id in self.contest_rooms:
            self.contest_rooms[contest_id].discard(websocket)
            if not self.contest_rooms[contest_id]:
                del self.contest_rooms[contest_id]
        self.socket_to_contest.pop(websocket, None)
    
    async def broadcast_to_contest(self, contest_id: str, message: dict):
        if contest_id not in self.contest_rooms:
            return
        dead_sockets = set()
        for ws in self.contest_rooms[contest_id]:
            try:
                await ws.send_json(message)
            except Exception:
                dead_sockets.add(ws)
        for ws in dead_sockets:
            self.disconnect(ws)
    
    async def send_personal(self, websocket: WebSocket, message: dict):
        try:
            await websocket.send_json(message)
        except Exception:
            self.disconnect(websocket)


manager = ConnectionManager()