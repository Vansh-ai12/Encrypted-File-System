from xml.etree.ElementPath import ops
from django.db.models import Max

from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async

from django.core.cache import cache
import json
import copy

from django.db import transaction

import time


ACTIVE_USERS_TTL = 60 * 60  # 1 hour

MAX_LAYERS_PER_TYPE = 100

CURRENT_VERSION_KEY = "board:{board_id}:version"




class BoardConsumer(AsyncWebsocketConsumer):

    async def connect(self):
        self._last_cursor_ts = 0

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

        users_key = f"board:{self.board_id}:users"
        users = safe_cache_get(users_key, {})

        now = time.time()
        stale = []

        for uid, u in users.items():
            if now - u.get("lastSeen", now) > 30:  # 30 sec timeout
                stale.append(uid)   
        for uid in stale:
            users.pop(uid, None)

        safe_cache_set(users_key, users, timeout=ACTIVE_USERS_TTL)   
        
        existing = users.get(self.user.id)

        if existing:
            conns = existing.get("connections")
            existing["lastSeen"] = time.time()


    # 🔥 MIGRATION: convert old set → list
            if isinstance(conns, set):
                existing["connections"] = list(conns)

            if self.connection_id not in existing["connections"]:
                existing["connections"].append(self.connection_id)


        else:
            users[self.user.id] = {
        "userId": self.user.id,
        "name": self.user.username,
        "fallback": self.user.username[0].upper(),
        "connections": [self.connection_id],
        "lastSeen": time.time(),
    }

        safe_cache_set(users_key, users, timeout=ACTIVE_USERS_TTL)

    # 🔥 JOIN EVENT ONLY ON FIRST CONNECTION
        if not existing:
            await self.channel_layer.group_send(
            self.group_name,
            {
                "type": "user.join",
                "user": {
                    "userId": self.user.id,
                    "name": self.user.username,
                    "fallback": self.user.username[0].upper(),
                    "connectionId": self.connection_id,
                },
                "sender": self.channel_name,
            }
        )
            
        layers_key = f"board:{self.board_id}:layers"
        

# ---------- INIT STATE ----------
        layers = safe_cache_get(layers_key)
        version_key = CURRENT_VERSION_KEY.format(board_id=self.board_id)

        if layers is None:

            snapshot_layers, snapshot_version = await self.load_latest_snapshot_from_db()

            layers = self.dedupe_layers([
        self.normalize_layer(l) for l in snapshot_layers
    ])

            ops, max_version = await self.load_operations_from_db(snapshot_version)


            for op in ops:
                layers = apply_op(layers, op.payload)

            safe_cache_set(layers_key, layers, timeout=None)
            safe_cache_set(version_key, max_version, timeout=None)

        else:
            layers = self.dedupe_layers([
            self.normalize_layer(l) for l in layers
    ])


        await self.send(json.dumps({
    "type": "INIT_STATE",
    "layers": layers,
    "version": safe_cache_get(version_key, 0),
    "maxVersion": await self.get_max_version(),
}))




        
    # ---------- INIT USERS ----------
        users_payload = []
        for u in users.values():
            conns = u.get("connections")
            if not isinstance(conns, list):
                continue

            for cid in conns:
                users_payload.append({
                "userId": u["userId"],
                "name": u["name"],
                "fallback": u["fallback"],
                "connectionId": cid,
            })

        await self.send(json.dumps({
        "type": "INIT_USERS",
        "users": users_payload,
        "selfConnectionId": self.connection_id,
    }))
        await self.channel_layer.group_send(
    self.group_name,
    {
        "type": "cursor.move",
        "connectionId": self.connection_id,
        "x": 0,
        "y": 0,
        "sender": self.channel_name,
    }
)

    
    async def text_live(self, event):
        if event["sender"] == self.channel_name:
            return

        await self.send(json.dumps({
        "type": "TEXT_LIVE_UPDATE",
        "id": event["id"],
        "value": event["value"],
        "width": event["width"],
        "height": event["height"],
        "connectionId": event["sender"],
    }))
    async def note_live(self, event):
        if event["sender"] == self.channel_name:
            return

        await self.send(json.dumps({
        "type": "NOTE_LIVE_UPDATE",
        "id": event["id"],
        "value": event["value"],
        "width": event["width"],
        "height": event["height"],
    }))



    async def disconnect(self, code):
        users_key = f"board:{self.board_id}:users"
        users = safe_cache_get(users_key, {})

        existing = users.get(self.user.id)
        if not existing:
            return
        if existing:
        # ✅ remove THIS connection only
            if self.connection_id in existing["connections"]:
                existing["connections"].remove(self.connection_id)

        # ✅ if no connections left → user truly gone
        # 🔥 ALWAYS notify cursor removal PER CONNECTION
        await self.channel_layer.group_send(
    self.group_name,
    {
        "type": "user.leave",
        "userId": self.user.id,
        "connectionId": self.connection_id,
    }
)

# Only remove user from cache when no connections left
        if not existing["connections"]:
            users.pop(self.user.id) 

        safe_cache_set(users_key, users, timeout=ACTIVE_USERS_TTL)

        await self.channel_layer.group_discard(self.group_name, self.channel_name)



    async def receive(self, text_data):
        data = json.loads(text_data)

        if data["type"] == "CURSOR_MOVE":
            users_key = f"board:{self.board_id}:users"
            users = safe_cache_get(users_key, {})
            u = users.get(self.user.id)
            if u:
                u["lastSeen"] = time.time()
                safe_cache_set(users_key, users, timeout=ACTIVE_USERS_TTL)
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
        elif data["type"] == "TEXT_LIVE_UPDATE":
            await self.channel_layer.group_send(
        self.group_name,
        {
            "type": "text.live",
            "id": data["id"],
            "value": data["value"],
            "width": data["width"],
            "height": data["height"],
            "sender": self.channel_name,
        }
        )
        elif data["type"] == "NOTE_LIVE_UPDATE":
            await self.channel_layer.group_send(
        self.group_name,
        {
            "type": "note.live",
            "id": data["id"],
            "value": data["value"],
            "width": data["width"],
            "height": data["height"],
            "sender": self.channel_name,
        }
    )
        elif data["type"] == "LAYER_SELECT":
            await self.channel_layer.group_send(
        self.group_name,
        {
            "type": "layer.selected",
            "layerId": data["layerId"],
            "connectionId": self.connection_id,
            "sender": self.channel_name,
        }
    )

        elif data["type"] == "LAYER_DESELECT":
            await self.channel_layer.group_send(
        self.group_name,
        {
            "type": "layer.deselected",
            "connectionId": self.connection_id,
            "sender": self.channel_name,
        }
    )





            
        

    async def layer_selected(self, event):
        if event["sender"] == self.channel_name:
            return
        await self.send(json.dumps({
        "type": "LAYER_SELECTED",
        "layerId": event["layerId"],
        "connectionId": event["connectionId"],
    }))

    async def layer_deselected(self, event):
        if event["sender"] == self.channel_name:
            return
        await self.send(json.dumps({
        "type": "LAYER_DESELECTED",
        "connectionId": event["connectionId"],
    }))



    async def cursor_move(self, event):
        if event.get("sender") == self.channel_name:
            return
        await self.send(json.dumps({
            "type": "CURSOR_MOVE",
            "connectionId": event["connectionId"],
            "x": event["x"],
            "y": event["y"],
        }))

    async def cursor_hide(self, event):
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
        "userId": event["userId"],
        "connectionId": event["connectionId"],
    }))

    async def handle_commit(self, data):
        layers_key = f"board:{self.board_id}:layers"
        version_key = CURRENT_VERSION_KEY.format(board_id=self.board_id)  # ✅ DEFINE FIRST

    # ---------- CURRENT ----------
        # ---------- CURRENT ----------
        current_layers = safe_cache_get(layers_key) or []
        current_layers = [self.normalize_layer(l) for l in current_layers]

# ---------- INCOMING ----------
        incoming_layers = [
    self.normalize_layer(l) for l in data.get("layers", [])
]
        incoming_layers = self.enforce_layer_limits(
    self.dedupe_layers(incoming_layers)
)

# ---------- PERSIST OPS ----------
        ops = diff_layers(current_layers, incoming_layers)
        if not ops:
            return  # 🔒 DO NOT increment version

# 🔥 WRITE TO REDIS ONLY AFTER CONFIRMED CHANGE
        safe_cache_set(layers_key, incoming_layers, timeout=None)
# ---------- CLEAR REDO HISTORY ----------
        
  # 🔒 DO NOT increment version

        current_version = safe_cache_get(version_key, 0)

        new_version = current_version + 1

        safe_cache_set(version_key, new_version, timeout=None)

# 🔥 clear redo ONLY when real commit happens
        await self.clear_redo_history(new_version)


# persist ops
        await self.persist_operations(
    prev_layers=current_layers,
    next_layers=incoming_layers,
    version=new_version
)



        current_version = safe_cache_get(version_key, 0)
        max_version = await self.get_max_version()

    # ---------- BROADCAST ----------
        await self.channel_layer.group_send(
        self.group_name,
        {
            "type": "layers.replace",
            "layers": incoming_layers,
            "version": current_version,
            "maxVersion": max_version,
        }
    )

    # ---------- SNAPSHOT ----------
        if current_version > 0 and current_version % 50 == 0:
            await self.persist_snapshot(incoming_layers)







        
    async def handle_undo(self):
        version_key = CURRENT_VERSION_KEY.format(board_id=self.board_id)
        current_version = safe_cache_get(version_key, 0)

        if current_version <= 0:
            return

        new_version = current_version - 1
        layers = await self.rebuild_layers_at_version(new_version)

        safe_cache_set(version_key, new_version, timeout=None)
        safe_cache_set(f"board:{self.board_id}:layers", layers, timeout=None)

        await self.channel_layer.group_send(
    self.group_name,
    {
        "type": "layers.replace",
        "layers": layers,
        "version": new_version,
        "maxVersion": await self.get_max_version(),
    }
)


    
    async def handle_redo(self):
        version_key = CURRENT_VERSION_KEY.format(board_id=self.board_id)
        current_version = safe_cache_get(version_key, 0)

        max_version = await self.get_max_version()
        if current_version >= max_version:
            return

        new_version = current_version + 1
        layers = await self.rebuild_layers_at_version(new_version)

        safe_cache_set(version_key, new_version, timeout=None)
        safe_cache_set(f"board:{self.board_id}:layers", layers, timeout=None)

        await self.channel_layer.group_send(
    self.group_name,
    {
        "type": "layers.replace",
        "layers": layers,
        "version": new_version,
        "maxVersion": await self.get_max_version(),
    }
)


    
    async def layers_replace(self, event):
        await self.send(json.dumps({
        "type": "LAYERS_REPLACE",
        "layers": event["layers"],
        "version": event.get("version"),
        "maxVersion": event.get("maxVersion"),
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
    @database_sync_to_async
    def persist_snapshot(self, layers):
        from board.models import BoardSnapshot
        version_key = CURRENT_VERSION_KEY.format(board_id=self.board_id)
        version = safe_cache_get(version_key, 0)

        with transaction.atomic():
            BoardSnapshot.objects.create(
            board_id=self.board_id,
            layers=layers,
            version=version
        )

    @database_sync_to_async
    def load_latest_snapshot_from_db(self):
        from board.models import BoardSnapshot

        snap = (
    BoardSnapshot.objects
    .filter(board_id=self.board_id)
    .order_by("-version")
    .first()
)


        return (snap.layers, snap.version) if snap else ([], 0)

    

    @database_sync_to_async
    def persist_operations(self, prev_layers, next_layers, version):
        from board.models import BoardOperation

        ops = diff_layers(prev_layers, next_layers)
        if not ops:
            return

        with transaction.atomic():
            records = []
            for op in ops:
                records.append(BoardOperation(
                board_id=self.board_id,
                user_id=self.user.id,
                op_type=op["type"],
                payload=op,
                version=version  # 🔒 SINGLE SOURCE OF TRUTH
            ))

            BoardOperation.objects.bulk_create(records)


    
    @database_sync_to_async
    def load_operations_from_db(self, since_version=0):
        from board.models import BoardOperation

        ops = BoardOperation.objects.filter(
    board_id=self.board_id,
    version__gt=since_version
).order_by("version")


        max_version = ops.last().version if ops.exists() else 0
        return list(ops), max_version
    

    @database_sync_to_async
    def get_max_version(self):
        from board.models import BoardOperation
        return (
        BoardOperation.objects.filter(board_id=self.board_id)
        .aggregate(Max("version"))["version__max"]
        or 0
    )

    @database_sync_to_async
    def rebuild_layers_at_version(self, version):
        from board.models import BoardSnapshot, BoardOperation

    # ✅ snapshot MUST be <= target version
        snap = (
        BoardSnapshot.objects
        .filter(board_id=self.board_id, version__lte=version)
        .order_by("-version")
        .first()
    )

        base_version = snap.version if snap else 0
        layers = snap.layers if snap else []

        ops = BoardOperation.objects.filter(
        board_id=self.board_id,
        version__gt=base_version,
        version__lte=version
    ).order_by("version")

        for op in ops:
            layers = apply_op(layers, op.payload)

        return layers

    @database_sync_to_async
    def clear_redo_history(self, current_version):
        from board.models import BoardOperation
        BoardOperation.objects.filter(
        board_id=self.board_id,
        version__gt=current_version
    ).delete()







        

    def normalize_layer(self, layer):
        t = layer.get("type")
        style = layer.get("style") or {}

    # ---------- RECTANGLE ----------
        if t == "rectangle":
            style.setdefault("fill", "transparent")
            style.setdefault("stroke", "#000000")
            style.setdefault("strokeWidth", 1)

            return {
            **layer,
            "width": layer.get("width", 120),
            "height": layer.get("height", 80),
            "style": style,
        }

    # ---------- ELLIPSE ----------
        if t == "ellipse":
            style.setdefault("fill", "transparent")
            style.setdefault("stroke", "#000000")
            style.setdefault("strokeWidth", 1)

            return {
            **layer,
            "width": layer.get("width", 120),
            "height": layer.get("height", 120),
            "style": style,
        }

    # ---------- PATH ----------
        if t == "path":
            style.setdefault("stroke", "#000000")
            style.setdefault("strokeWidth", 1)

            return {
            **layer,
            "style": style,
        }

    # ---------- TEXT ----------
        if t == "text":
            style.setdefault("textColor", "#000000")
            style.setdefault("fontSize", 20)

            return {
            **layer,
            "value": layer.get("value", ""),
            "width": layer.get("width", 10),
            "height": layer.get("height", 20),
            "style": style,
        }

    # ---------- NOTE ----------
        if t == "note":
            style.setdefault("fill", "#FFF59D")
            style.setdefault("textColor", "#000000")
            style.setdefault("fontSize", 20)

            return {
            **layer,
            "value": layer.get("value", ""),
            "width": layer.get("width", 120),
            "height": layer.get("height", 40),
            "style": style,
        }

        return layer


    def dedupe_layers(self, layers):
        """
        Enforce unique layer IDs.
        Last write wins.
        """
        unique = {}
        for layer in layers:
            if "id" in layer:
                unique[layer["id"]] = layer
        return list(unique.values())


    def enforce_layer_limits(self, layers):
        counts = {}
        result = []

        for layer in layers:
            t = layer.get("type")
            if not t:
                continue

            counts[t] = counts.get(t, 0) + 1

        # ✅ KEEP OLD LAYERS
            if counts[t] <= MAX_LAYERS_PER_TYPE:
                result.append(layer)
            else:
            # ❌ IGNORE ONLY THE NEW EXCESS
                continue

        return result
    
def diff_layers(prev, next):
    prev_map = {l["id"]: l for l in prev}
    next_map = {l["id"]: l for l in next}

    ops = []

    for lid, layer in next_map.items():
        if lid not in prev_map:
            ops.append({
                "type": "ADD",
                "layer": layer,
            })
            continue

        before = prev_map[lid]

        # 🚫 IGNORE EDITING / LIVE NOISE
        if (
            before.get("value") == layer.get("value") and
            before.get("width") == layer.get("width") and
            before.get("height") == layer.get("height") and
            before.get("x") == layer.get("x") and
            before.get("y") == layer.get("y") and
            before.get("style") == layer.get("style")
        ):
            continue

        ops.append({
            "type": "UPDATE",
            "before": before,
            "after": layer,
        })

    for lid, layer in prev_map.items():
        if lid not in next_map:
            ops.append({
                "type": "DELETE",
                "layer": layer,
            })

    return ops


def apply_op(layers, op):
    layers = list(layers)

    if op["type"] == "ADD":
        layers.append(op["layer"])

    elif op["type"] == "UPDATE":
        layers = [
            op["after"] if l["id"] == op["after"]["id"] else l
            for l in layers
        ]

    elif op["type"] == "DELETE":
        layers = [
            l for l in layers if l["id"] != op["layer"]["id"]
        ]

    return layers


def safe_cache_get(key, default=None):
    try:
        return cache.get(key, default)
    except Exception:
        return default

def safe_cache_set(key, value, timeout=None):
    try:
        cache.set(key, value, timeout)
    except Exception:
        pass

