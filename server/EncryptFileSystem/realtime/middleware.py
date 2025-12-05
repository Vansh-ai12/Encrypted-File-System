from channels.middleware import BaseMiddleware
from channels.db import database_sync_to_async

class TokenAuthMiddleware(BaseMiddleware):
    async def __call__(self, scope, receive, send):
        from django.contrib.auth.models import AnonymousUser

        headers = dict(scope.get("headers", []))
        cookie_header = headers.get(b"cookie", b"").decode()

        token = None
        for c in cookie_header.split(";"):
            if c.strip().startswith("session="):
                token = c.split("=")[1]

        if token:
            user = await self.get_user(token)
            scope["user"] = user or AnonymousUser()
        else:
            scope["user"] = AnonymousUser()

        return await super().__call__(scope, receive, send)

    @database_sync_to_async
    def get_user(self, token):
        from user.models import Users
        try:
            return Users.objects.get(token=token)
        except Users.DoesNotExist:
            return None
