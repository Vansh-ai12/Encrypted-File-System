import json
import secrets
from django.http import JsonResponse
from django.shortcuts import render

from .Hashing import createHash
from django.views.decorators.csrf import csrf_exempt

from .models import Users
from http import cookies
# Create your views here.

@csrf_exempt
def signUp(request):
    salt = "Encrypt@12345#"
    data  = json.loads(request.body)
    username = data.get("username")
    password = data.get("password")
    email = data.get("email")
    token =  secrets.token_hex(32)
    if not username or not password or not email:
        return JsonResponse({"error": "Missing parameters"}, status=400)

    hashed_password = createHash(password, salt)
    user_obj = Users(username=username, password=hashed_password, email=email,token=token)
    user_obj.save()


    
    response = JsonResponse({"message": "User created successfully"}, status=201)
    response.set_cookie(
        key="session",
        value=token,
        path="/",
        httponly=True,
        samesite="Lax"
    )
    return response


@csrf_exempt
def login(request):
    salt= "Encrypt@12345#"
    data  = json.loads(request.body)
    username = data.get("username")
    password = data.get("password")
    if not username or not password:
        return JsonResponse({"error": "Missing parameters"}, status=400)
    try:
        user = Users.objects.get(username=username)
    except Users.DoesNotExist: 
        return JsonResponse({"error": "Invalid username or password"}, status=401)
    hashed_password = createHash(password, salt)
    if user.password != hashed_password:
        return JsonResponse({"error": "Invalid username or password"}, status=401)
    token =  secrets.token_hex(32)
    user.token = token
    user.save()
    response = JsonResponse({"message": "Login successful"}, status=200)
    response.set_cookie(
        key="session",
        value=token,
        path="/",
        httponly=True,
        samesite="Lax",
        expires=604800
    )
    return response


@csrf_exempt
def logout(request):
    cookie = cookies.SimpleCookie()
    cookie.load(request.META.get("HTTP_COOKIE", ""))
    session_token = cookie.get("session")
    if session_token:
        try:
            user = Users.objects.get(token=session_token.value)
            user.token = None
            user.save()
        except Users.DoesNotExist:
            pass
    response = JsonResponse({"message": "Logout successful"}, status=200)
    response.delete_cookie("session", path="/")
    return response


def changePassword(request):
    salt = "Encrypt@12345#"
    data  = json.loads(request.body)
    username = data.get("username")
    new_password = data.get("new_password")
    if not username or not new_password:
        return JsonResponse({"error": "Missing parameters"}, status=400)
    try:
        user = Users.objects.get(username=username)
    except Users.DoesNotExist: 
        return JsonResponse({"error": "User does not exist"}, status=404)
    
    hashed_password = createHash(new_password, salt)
    user.password = hashed_password
    user.save()
    return JsonResponse({"message": "Password changed successfully"}, status=200)






