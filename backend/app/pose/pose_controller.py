from __future__ import annotations

import json

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from starlette.websockets import WebSocketState

from app.pose.pose_service import DEFAULT_GOAL_COUNT, PoseFeedbackService


router = APIRouter(tags=["pose"])
pose_feedback_service = PoseFeedbackService()


@router.websocket("/ws/workout-feedback")
async def workout_feedback_websocket(websocket: WebSocket) -> None:
    await websocket.accept()
    session_state = pose_feedback_service.create_session(goal_count=DEFAULT_GOAL_COUNT)

    async def send_error(message: str) -> None:
        if websocket.client_state != WebSocketState.CONNECTED:
            return
        await websocket.send_json(
            pose_feedback_service.build_error_message(message, state=session_state),
        )

    await websocket.send_json(
        pose_feedback_service.build_session_started_message(session_state),
    )

    try:
        while True:
            raw_text = await websocket.receive_text()
            try:
                payload = json.loads(raw_text)
            except json.JSONDecodeError:
                await send_error("잘못된 JSON 형식입니다.")
                continue

            if not isinstance(payload, dict):
                await send_error("JSON payload는 객체여야 합니다.")
                continue

            response = pose_feedback_service.handle_message(
                session_state,
                payload=payload,
            )
            await websocket.send_json(response)
    except WebSocketDisconnect:
        return
