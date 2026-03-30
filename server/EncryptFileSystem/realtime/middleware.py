# realtime/middleware.py
from channels.middleware import BaseMiddleware
from channels.db import database_sync_to_async
from urllib.parse import parse_qs

class SimpleAnonymousUser:
    id = None
    is_authenticated = False

class TokenAuthMiddleware(BaseMiddleware):
    async def __call__(self, scope, receive, send):
        scope["user"] = SimpleAnonymousUser()

        query = parse_qs(scope["query_string"].decode())
        token = query.get("token", [None])[0]

        if token:
            print("QUERY STRING:", scope["query_string"])
            print("TOKEN:", token)
            user = await self.get_user(token)
            if user:
                scope["user"] = user

        return await super().__call__(scope, receive, send)

    @database_sync_to_async
    def get_user(self, token):
        from user.models import Users
    
        user = Users.objects.filter(token=token).first()
    
        print("DB USER:", user)
    
        if not user:
            print("❌ TOKEN NOT FOUND IN DB:", token)
    
        return user