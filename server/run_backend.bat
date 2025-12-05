@echo off
echo Starting Django + WebSocket server...

REM Activate venv
call .venv\Scripts\activate

REM Go into Django project folder
cd EncryptFileSystem

REM Make sure correct settings module is applied (extra safety)
set DJANGO_SETTINGS_MODULE=EncryptFileSystem.settings

REM Start Daphne
daphne -b 127.0.0.1 -p 8000 EncryptFileSystem.asgi:application
