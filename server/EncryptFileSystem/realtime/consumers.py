from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.core.cache import cache
import json
import copy

ACTIVE_USERS_TTL = 60 * 60  # 1 hour


class BoardConsumer(AsyncWebsocketConsumer):

    async def connect(self):
        self.board_id = self.scope["url_route"]["kwargs"]["board_id"]
        self.group_name = f"board_{self.board_id}"
        self.user = self.scope.get("user")
        self.connection_id = self.channel_name

        if not self.user or not getattr(self.user, "id", None):
            await self.close(code=4001)
            return

        if not await self.user_has_access(self.user, self.board_id):
            await self.close(code=4003)
            return

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

        user_payload = {
            "userId": self.user.id,
            "connectionId": self.connection_id,
            "name": self.user.username,
            "fallback": self.user.username[0].upper(),
            "x": None,
            "y": None,
        }

        users_key = f"board:{self.board_id}:users"
        users = cache.get(users_key, {})

# 🔥 REMOVE OLD CONNECTIONS OF SAME USER
        for cid, u in list(users.items()):
            if u["userId"] == self.user.id:
                users.pop(cid)

# ADD CURRENT CONNECTION
        users[self.connection_id] = user_payload
        cache.set(users_key, users, timeout=ACTIVE_USERS_TTL)


        layers_key = f"board:{self.board_id}:layers"
        
        layers = cache.get(layers_key) or []

# 🔥 NORMALIZE HERE
        layers = [self.normalize_layer(l) for l in layers]

        cache.set(layers_key, layers, timeout=None)

        await self.send(json.dumps({
    "type": "INIT_STATE",
    "layers": layers,
    "selfConnectionId": self.connection_id,
}))


        # ---- INIT USERS (FIXED) ----
        await self.send(json.dumps({
            "type": "INIT_USERS",
            "users": list(users.values()),
            "selfConnectionId": self.connection_id,
        }))

        await self.channel_layer.group_send(
            self.group_name,
            {
                "type": "user.join",
                "user": user_payload,
                "sender": self.channel_name,
            }
        )

    async def disconnect(self, code):
        users_key = f"board:{self.board_id}:users"
        users = cache.get(users_key, {})

        if self.connection_id in users:
            users.pop(self.connection_id)
            cache.set(users_key, users, timeout=ACTIVE_USERS_TTL)

            await self.channel_layer.group_send(
                self.group_name,
                {
                    "type": "user.leave",
                    "connectionId": self.connection_id,
                }
            )

        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data):
        data = json.loads(text_data)

        if data["type"] == "CURSOR_MOVE":
            await self.channel_layer.group_send(
                self.group_name,
                {
                    "type": "cursor.move",
                    "connectionId": self.connection_id,
                    "x": data["x"],
                    "y": data["y"],
                    "sender": self.channel_name,
                }
            )

        elif data["type"] == "CURSOR_LEAVE":
            await self.channel_layer.group_send(
                self.group_name,
                {
                    "type": "cursor.hide",
                    "connectionId": self.connection_id,
                    "sender": self.channel_name,
                }
            )
        elif data["type"] == "LAYERS_COMMIT":
            await self.handle_commit(data)

        elif data["type"] == "UNDO":
            await self.handle_undo()
        
        elif data["type"] == "REDO":
            await self.handle_redo()

    async def cursor_move(self, event):
        if event["sender"] == self.channel_name:
            return
        await self.send(json.dumps({
            "type": "CURSOR_MOVE",
            "connectionId": event["connectionId"],
            "x": event["x"],
            "y": event["y"],
        }))

    async def cursor_hide(self, event):
        if event["sender"] == self.channel_name:
            return
        await self.send(json.dumps({
            "type": "CURSOR_HIDE",
            "connectionId": event["connectionId"],
        }))

    async def user_join(self, event):
        if event["sender"] == self.channel_name:
            return
        await self.send(json.dumps({
            "type": "USER_JOIN",
            "user": event["user"],
        }))

    async def user_leave(self, event):
        await self.send(json.dumps({
            "type": "USER_LEAVE",
            "connectionId": event["connectionId"],
        }))

    async def handle_commit(self, data):
        layers_key = f"board:{self.board_id}:layers"
        history_key = f"board:{self.board_id}:history"
        redo_key = f"board:{self.board_id}:redo"

        # ✅ GET CURRENT STATE FIRST
        layers = cache.get(layers_key) or []
    # ✅ NORMALIZE CURRENT STATE BEFORE SAVING TO HISTORY
        layers = [self.normalize_layer(l) for l in layers]

        history = cache.get(history_key) or []
        history.append(copy.deepcopy(layers))
        history = history[-50:]  # MAX_HISTORY

        cache.set(history_key, history, timeout=None)
        cache.set(redo_key, [], timeout=None)
    # ✅ NORMALIZE INCOMING STATE
        normalized = [self.normalize_layer(l) for l in data["layers"]]
        cache.set(layers_key, normalized, timeout=None)

    # ✅ BROADCAST AUTHORITATIVE STATE
        await self.channel_layer.group_send(
            self.group_name,
            {
                "type": "layers.replace",
                "layers": normalized,
            }
        )
        
    async def handle_undo(self):
        layers_key = f"board:{self.board_id}:layers"
        history_key = f"board:{self.board_id}:history"
        redo_key = f"board:{self.board_id}:redo"

        history = cache.get(history_key) or []
        if not history:
            return

        layers = cache.get(layers_key)
        redo = cache.get(redo_key) or []

        prev = history.pop()
        redo.insert(0, layers)
        cache.set(history_key, history, timeout=None)
        cache.set(redo_key, redo, timeout=None)
        cache.set(layers_key, prev, timeout=None)

        await self.channel_layer.group_send(
            self.group_name,
            {
                "type": "layers.replace",
                "layers": prev,
            }
        )
    
    async def handle_redo(self):
        layers_key = f"board:{self.board_id}:layers"
        history_key = f"board:{self.board_id}:history"
        redo_key = f"board:{self.board_id}:redo"

        redo = cache.get(redo_key) or []
        if not redo:
            return

        layers = cache.get(layers_key)
        history = cache.get(history_key) or []

        next_layers = redo.pop(0)
        history.append(copy.deepcopy(layers))

        cache.set(history_key, history, timeout=None)
        cache.set(redo_key, redo, timeout=None)
        cache.set(layers_key, next_layers, timeout=None)

        await self.channel_layer.group_send(
            self.group_name,
            {
                "type": "layers.replace",
                "layers": next_layers,
            }
        )
    
    async def layers_replace(self, event):
        await self.send(json.dumps({
            "type": "LAYERS_REPLACE",
            "layers": event["layers"],
        }))





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
    def normalize_layer(self, layer):
        t = layer.get("type")

        if t == "rectangle":
            return {
            **layer,
            "width": layer.get("width", 120),
            "height": layer.get("height", 80),
        }

        if t == "ellipse":
            return {
            **layer,
            "width": layer.get("width", 120),
            "height": layer.get("height", 120),
        }

        return layer

