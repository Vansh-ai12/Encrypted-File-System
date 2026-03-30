from channels.routing import ProtocolTypeRouter, URLRouter
from django.core.asgi import get_asgi_application
from realtime.middleware import TokenAuthMiddleware
from realtime.routing import websocket_urlpatterns
from channels.auth import AuthMiddlewareStack

import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'EncryptFileSystem.settings')

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": AuthMiddlewareStack(
    TokenAuthMiddleware(
        URLRouter(websocket_urlpatterns)
    )
),
})
