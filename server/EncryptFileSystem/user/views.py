import json
import secrets
from django.http import JsonResponse
from django.shortcuts import render

from .Hashing import createHash
from django.views.decorators.csrf import csrf_exempt

from .models import Users
from http import cookies


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
    secure=True,  
    samesite="None", 
    max_age=60 * 60 * 24 * 7,
    domain="127.0.0.1",
)



    return response
@csrf_exempt
def login(request):
    if request.method == "OPTIONS":
        response = JsonResponse({"message": "Preflight OK"}, status=200)
        response["Access-Control-Allow-Origin"] = "http://localhost:3000"
        response["Access-Control-Allow-Credentials"] = "true"
        response["Access-Control-Allow-Headers"] = "Content-Type"
        response["Access-Control-Allow-Methods"] = "POST, OPTIONS"
        return response
    if request.method != "POST":
        return JsonResponse({"error": "Invalid request method"}, status=405)

    salt = "Encrypt@12345#"

    try:
        data = json.loads(request.body)
    except:
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return JsonResponse({"error": "Missing parameters"}, status=400)

    try:
        user = Users.objects.get(email=email)
    except Users.DoesNotExist:
        return JsonResponse({"error": "Invalid email or password"}, status=401)

    hashed_password = createHash(password, salt)

    if user.password != hashed_password:
        return JsonResponse({"error": "Invalid email or password"}, status=401)

   
    token = secrets.token_hex(32)
    Users.objects.filter(email=email).update(token=None)
    user.token = token
    user.save()

    print("LOGIN TOKEN SET:", token)

    response = JsonResponse({"message": "Login successful"}, status=200)
    response.set_cookie(
    key="session",
    value=token,
    path="/",
    httponly=True,
    secure=True,  
    samesite="None", 
    max_age=60 * 60 * 24 * 7,
    domain="127.0.0.1",
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


@csrf_exempt
def check_session(request):
    token = request.COOKIES.get("session")
    user = Users.objects.filter(token=token).first()

    if not user:
        return JsonResponse({"loggedIn": False})

    return JsonResponse({
        "loggedIn": True,
        "username": user.username,
        "activeOrgId": user.activeOrganisation.organisationId 
                        if user.activeOrganisation else None
    })








