from genericpath import exists
from marshal import version
from marshal import version
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
        
        print("USER IN SCOPE:", self.scope.get("user"))
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

# 🔥 ALWAYS SYNC VERSION WITH DB HEAD (prevents empty history bug)
        db_head = await self.get_max_version()
        cached_version = safe_cache_get(version_key)

        if layers is None:
    # Cold start → rebuild full state from snapshot + ops
            snapshot_layers, snapshot_version = await self.load_latest_snapshot_from_db()

            base_layers = [
        self.normalize_layer(l) for l in (snapshot_layers or [])
    ]
            base_layers = self.dedupe_layers(base_layers)

            ops, _ = await self.load_operations_from_db(snapshot_version or 0)

            layers = copy.deepcopy(base_layers)
            for op in ops:
                layers = apply_op(layers, op.payload)

            layers = self.dedupe_layers([
                self.normalize_layer(l)
        for l in layers
        if isinstance(l, dict) and "id" in l
    ])

            safe_cache_set(layers_key, layers, timeout=None)

    # 🔥 ONLY set version on cold cache
            safe_cache_set(version_key, db_head or 0, timeout=None)
            current_version = db_head or 0

        else:
    # Cache exists → DO NOT override version cursor
            layers = self.dedupe_layers([
        self.normalize_layer(l) for l in layers
    ])

            if cached_version is None:
                current_version = db_head or 0
                safe_cache_set(version_key, current_version, timeout=None)
            else:
                current_version = cached_version

        current_version = db_head or 0
        max_version = db_head or 0


        if cached_version is None:
    # cache cold → restore to HEAD so history exists after refresh
            db_head = await self.get_max_version()
            current_version = db_head or 0
            safe_cache_set(version_key, current_version, timeout=None)
        else:
            current_version = cached_version

# TRUE history head (for redo boundary)
        max_version = await self.get_max_version()

        await self.send(json.dumps({
    "type": "INIT_STATE",
    "layers": layers,
    "version": current_version,   # 🔥 NEVER 0 on refresh if history exists
    "maxVersion": max_version,
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
            await self.handle_undo(data.get("layerId"))
        
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
        # 🔥 CRITICAL FIX: deep copy current layers to avoid reference mutation (PENCIL UNDO BUG)
        cached = safe_cache_get(layers_key) or []
        current_layers = copy.deepcopy(cached)
        current_layers = [self.normalize_layer(l) for l in current_layers]


# ---------- INCOMING ----------
        incoming_layers_raw = data.get("layers", None)

# 🛑 HARD GUARD: NEVER accept accidental empty commits (UI race / history frames)
        if incoming_layers_raw is None:
            return

        # 🛑 Only block accidental NULL commits, NOT real empty states
        if incoming_layers_raw is None:
            return


        incoming_layers = [
    self.normalize_layer(l) for l in incoming_layers_raw
]
        incoming_layers = self.enforce_layer_limits(
    self.dedupe_layers(incoming_layers)
)


# ---------- PERSIST OPS ----------
        ops = diff_layers(current_layers, incoming_layers)

# 🛑 TRUE NO-OP
        if not ops:
            return

        current_version = safe_cache_get(version_key, 0)
        new_version = current_version + 1

# 1️⃣ Persist ops at EXACT same version
        await self.persist_operations_from_diff(ops, new_version)

# 2️⃣ Update cache layers (authoritative state)
        safe_cache_set(layers_key, copy.deepcopy(incoming_layers), timeout=None)

# 3️⃣ Update cursor ONCE (DO NOT RE-INCREMENT AGAIN)
        safe_cache_set(version_key, new_version, timeout=None)





        




        current_version = safe_cache_get(version_key, 0)

# 🔥 CRITICAL FIX: UI must follow session head, NOT DB lifetime max
        max_version = await self.get_max_version()

        await self.channel_layer.group_send(
    self.group_name,
    {
        "type": "layers.replace",
        "layers": incoming_layers,
        "version": current_version,
        "maxVersion": max_version,  # ✅ TRUE HISTORY HEAD
    }
)



    # ---------- SNAPSHOT ----------
        if current_version > 0 and current_version % 50 == 0:
            await self.persist_snapshot(incoming_layers)







        
    async def handle_undo(self, layer_id=None):
        version_key = CURRENT_VERSION_KEY.format(board_id=self.board_id)
        current_version = safe_cache_get(version_key)
        if current_version is None:
            current_version = await self.get_max_version()
            safe_cache_set(version_key, current_version, timeout=None)


        if current_version <= 0:
            return

        new_version = current_version - 1
        layers = await self.rebuild_layers_at_version(new_version)
        if layer_id:
            current_layers = safe_cache_get(f"board:{self.board_id}:layers", [])
            current_map = {l["id"]: l for l in current_layers}
            rebuilt_map = {l["id"]: l for l in layers}

            if layer_id in rebuilt_map:
                current_map[layer_id] = rebuilt_map[layer_id]

            layers = list(current_map.values())

        safe_cache_set(version_key, new_version, timeout=None)
        safe_cache_set(f"board:{self.board_id}:layers", layers, timeout=None)

        max_version = await self.get_max_version()

        await self.channel_layer.group_send(
    self.group_name,
    {
        "type": "layers.replace",
        "layers": layers,
        "version": new_version,
        "maxVersion": max_version,  # 🔥 FIX: keep redo head
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
        "maxVersion": max_version,  # ✅ TRUE HEAD (NOT cursor)
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
    def snapshot_exists(self):
        from board.models import BoardSnapshot
        return BoardSnapshot.objects.filter(
        board_id=self.board_id,
        version=0
    ).exists()


    @database_sync_to_async
    def persist_operations_from_diff(self, ops, version):
        from board.models import BoardOperation

        if not ops:
            return

        with transaction.atomic():
            records = []
            for op in ops:
                records.append(
                BoardOperation(
                    board_id=self.board_id,
                    user_id=self.user.id,
                    op_type=op["type"],
                    payload=op,
                    version=version,
                )
            )

            BoardOperation.objects.bulk_create(records)

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

    # 🔹 Load closest snapshot <= target version
        snap = (
        BoardSnapshot.objects
        .filter(board_id=self.board_id, version__lte=version)
        .order_by("-version")
        .first()
    )

        base_version = snap.version if snap else 0
        layers = copy.deepcopy(snap.layers) if snap else []

    # 🔹 Replay ops deterministically
        ops = BoardOperation.objects.filter(
        board_id=self.board_id,
        version__gt=base_version,
        version__lte=version
    ).order_by("version")

        for op in ops:
            layers = apply_op(layers, op.payload)

    # 🔥 CRITICAL FIX: NORMALIZE AFTER REBUILD (THIS WAS MISSING)
        normalized = [
        self.normalize_layer(l)
        for l in layers
        if isinstance(l, dict) and "id" in l
    ]

    # 🔥 ALSO DEDUPE (prevents ghost mutation & duplicate IDs)
        normalized = self.dedupe_layers(normalized)

        return normalized


    def normalize_layer(self, layer):
        t = layer.get("type")

    # 🛑 CRITICAL: NEVER mutate original style dict
        existing_style = copy.deepcopy(layer.get("style") or {})

    # ---------- RECTANGLE ----------
        if t == "rectangle":
            return {
            **layer,
            "width": layer.get("width", 120),
            "height": layer.get("height", 80),
            "style": {
                "fill": existing_style.get("fill", "transparent"),
                "stroke": existing_style.get("stroke", "#000000"),
                "strokeWidth": existing_style.get("strokeWidth", 1),
                **existing_style,
            },
        }

    # ---------- ELLIPSE ----------
        if t == "ellipse":
            return {
            **layer,
            "width": layer.get("width", 120),
            "height": layer.get("height", 120),
            "style": {
                "fill": existing_style.get("fill", "transparent"),
                "stroke": existing_style.get("stroke", "#000000"),
                "strokeWidth": existing_style.get("strokeWidth", 1),
                **existing_style,
            },
        }

    # ---------- PATH (PENCIL) ----------
        if t == "path":
            return {
        **layer,
        "points": layer.get("points", []),
        "width": layer.get("width", 1),
        "height": layer.get("height", 1),
        "__isArrow": layer.get("__isArrow"),
        "__bendPoint": layer.get("__bendPoint"),
        "__arrowHead": layer.get("__arrowHead"),
        "style": {
            "stroke": existing_style.get("stroke", "#000000"),
            "strokeWidth": existing_style.get("strokeWidth", 2),
            **existing_style,
        },
    }

    # ---------- TEXT ----------
        if t == "text":
            return {
            **layer,
            "value": layer.get("value", ""),
            "width": layer.get("width", 10),
            "height": layer.get("height", 20),
            "style": {
                "textColor": existing_style.get("textColor", "#000000"),
                "fontSize": existing_style.get("fontSize", 20),
                **existing_style,
            },
        }

    # ---------- NOTE ----------
        if t == "note":
            return {
            **layer,
            "value": layer.get("value", ""),
            "width": layer.get("width", 120),
            "height": layer.get("height", 40),
            "style": {
                "fill": existing_style.get("fill", "#FFF59D"),
                "textColor": existing_style.get("textColor", "#000000"),
                "fontSize": existing_style.get("fontSize", 20),
                **existing_style,
            },
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

        # 🔥 CRITICAL: stable deep compare for pencil paths
        before_points = before.get("points", []) or []
        after_points = layer.get("points", []) or []

        points_equal = (
    len(before_points) == len(after_points) and
    all(
        bp.get("x") == ap.get("x") and bp.get("y") == ap.get("y")
        for bp, ap in zip(before_points, after_points)
    )
)

        if (
    before.get("value") == layer.get("value") and
    before.get("width") == layer.get("width") and
    before.get("height") == layer.get("height") and
    before.get("x") == layer.get("x") and
    before.get("y") == layer.get("y") and
    before.get("style") == layer.get("style") and
    before.get("__edgeArrows") == layer.get("__edgeArrows") and 
    points_equal
        ):
            continue


        ops.append({
            "type": "UPDATE",
            "before": before,
            "after": layer,
        })


    next_ids = set(next_map.keys())
    prev_ids = set(prev_map.keys())

    deleted_ids = prev_ids - next_ids

    for lid in deleted_ids:
        # ✅ Allow real deletes even if next becomes empty (required for undo correctness)
        ops.append({
            "type": "DELETE",
            "layer": prev_map[lid],
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

