from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
import json

class BoardConsumer(AsyncWebsocketConsumer):

    async def connect(self):
        self.board_id = self.scope["url_route"]["kwargs"]["board_id"]
        user = self.scope.get("user")

        print("🔍 User in connect:", user)

        if not user or not getattr(user, "id", None):
            print("❌ Unauthorized WebSocket User")
            await self.close()
            return

        allowed = await self.user_has_access(user, self.board_id)
        if not allowed:
            print(f"🚫 Access Denied: {user} -> board {self.board_id}")
            await self.close()
            return

        print(f"🟢 Access Granted: {user.username} -> board {self.board_id}")
        await self.accept()

        # 🚀 Send initial message so browser keeps WS open
        await self.send(json.dumps({
            "type": "welcome",
            "message": f"Connected to board {self.board_id}"
        }))

    async def receive(self, text_data):
        print("📩 Message Received:", text_data)

        data = json.loads(text_data)

        # Echo message back for testing
        await self.send(json.dumps({
            "type": "echo",
            "data": data
        }))

    async def disconnect(self, code):
        print(f"🔴 WS Disconnected: {code}")

    @database_sync_to_async
    def user_has_access(self, user, board_id):
        from board.models import Board
        from boardOrganisation.models import memberDetailModel
        try:
            board = Board.objects.get(boardId=board_id)
            return memberDetailModel.objects.filter(
                organisation=board.organisation,
                memberInfo=user
            ).exists()
        except Board.DoesNotExist:
            return False
