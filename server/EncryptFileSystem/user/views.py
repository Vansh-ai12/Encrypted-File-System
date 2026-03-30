import json
import secrets
from urllib import response
from django.http import JsonResponse
from django.shortcuts import render
from django.conf import settings
from django.shortcuts import redirect
import requests


from django.db.models import Sum

from .models import LoginActivity, SiteVisit


from .Hashing import createHash
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.csrf import ensure_csrf_cookie


from .models import Users
from http import cookies


@ensure_csrf_cookie
def signUp(request):
    
    if request.method == "OPTIONS":
        response = JsonResponse({"message": "Preflight OK"}, status=200)
        response["Access-Control-Allow-Origin"] = "http://localhost:3000"
        response["Access-Control-Allow-Credentials"] = "true"
        response["Access-Control-Allow-Headers"] = "Content-Type"
        response["Access-Control-Allow-Methods"] = "POST, OPTIONS"
        return response

    if request.method != "POST":
        return JsonResponse({"error": "Invalid method"}, status=405)

    salt = "Encrypt@12345#"

    try:
        data = json.loads(request.body)
    except:
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    username = data.get("username")
    password = data.get("password")
    email = data.get("email")

    if not username or not password or not email:
        return JsonResponse({"error": "Missing parameters"}, status=400)

    if Users.objects.filter(email=email).exists():
        return JsonResponse(
            {"error": "Email already registered"},
            status=400
        )

    hashed_password = createHash(password, salt)
    token = secrets.token_hex(32)

    user_obj = Users(
        username=username,
        password=hashed_password,
        email=email,
        token=token
    )
    user_obj.save()

    response = JsonResponse({
    "message": "User created successfully",
    "user_id": user_obj.id
}, status=201)
    response["Access-Control-Allow-Origin"] = "http://localhost:3000"
    response["Access-Control-Allow-Credentials"] = "true"

    response.set_cookie(
        key="session",
        value=token,
        path="/",
        httponly=True,
        secure=False,
        samesite="Lax",
        max_age=60 * 60 * 24 * 7,
    )

    return response


@ensure_csrf_cookie
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

    ip = request.META.get("REMOTE_ADDR")
    ua = request.META.get("HTTP_USER_AGENT")

    LoginActivity.objects.create(
    user=user,
    ip_address=ip,
    user_agent=ua
)

    print("LOGIN TOKEN SET:", token)

    response = JsonResponse({
    "message": "Login successful",
    "user_id": user.id   # 🔥 THIS IS THE FIX
}, status=200)
    response.set_cookie(
    key="session",
    value=token,
    path="/",
    httponly=True,
    secure=False,  
    samesite="Lax", 
    max_age=60 * 60 * 24 * 7,
    
)

    return response



@ensure_csrf_cookie
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

@ensure_csrf_cookie
def check_session(request):
    token = request.COOKIES.get("session")
    user = Users.objects.filter(token=token).first()

    if not user:
        return JsonResponse({"loggedIn": False})

    return JsonResponse({
    "loggedIn": True,
    "username": user.username,
    "token": user.token,
    "email":user.email,
    "githubUsername": user.github_username, 
    "provider": user.provider,
    "activeOrgId": (
        user.activeOrganisation.organisationId
        if user.activeOrganisation else None
    )
})


from django.views.decorators.csrf import ensure_csrf_cookie

@ensure_csrf_cookie
def csrf_bootstrap(request):
    return JsonResponse({"detail": "CSRF cookie set"})





def github_login(request):
    github_auth_url = (
        f"https://github.com/login/oauth/authorize"
        f"?client_id={settings.GITHUB_CLIENT_ID}"
        f"&scope=read:user user:email"
    )
    return redirect(github_auth_url)


def github_callback(request):
    code = request.GET.get("code")
    if not code:
        return JsonResponse({"error": "No code provided"}, status=400)

    # Exchange code for access token
    token_res = requests.post(
        "https://github.com/login/oauth/access_token",
        headers={"Accept": "application/json"},
        data={
            "client_id": settings.GITHUB_CLIENT_ID,
            "client_secret": settings.GITHUB_CLIENT_SECRET,
            "code": code,
        },
    )

    token_json = token_res.json()
    access_token = token_json.get("access_token")

    if not access_token:
        return JsonResponse({"error": "GitHub token failed"}, status=400)

    # Get GitHub user
    user_res = requests.get(
        "https://api.github.com/user",
        headers={"Authorization": f"Bearer {access_token}"}
    )
    user_data = user_res.json()

    # Get verified emails
    email_res = requests.get(
        "https://api.github.com/user/emails",
        headers={"Authorization": f"Bearer {access_token}"}
    )
    emails = email_res.json()

    primary_email = None
    for e in emails:
        if e.get("primary") and e.get("verified"):
            primary_email = e.get("email")
            break

    if not primary_email:
        # fallback but still treated as NEW user
        primary_email = f"{user_data['login']}@github-oauth.local"

    github_id = str(user_data.get("id"))
    github_username = user_data.get("login")

    # 🔥 STEP 1: Exact same GitHub account (safe login)
    user = Users.objects.filter(
        provider="github",
        provider_id=github_id
    ).first()

    # 🔥 STEP 2: STRICT EMAIL MATCHING (YOUR REQUIREMENT)
    if not user:
        existing_email_user = Users.objects.filter(email=primary_email).first()

        if existing_email_user:
            # ONLY link if email EXACTLY matches
            user = existing_email_user
            user.provider = "github"
            user.provider_id = github_id
            user.github_username = github_username
            user.save()
        else:
            # 🔥 CREATE COMPLETELY NEW ACCOUNT (NO LINKING)
            random_password = secrets.token_hex(16)
            hashed_password = createHash(random_password, "Encrypt@12345#")

            base_username = github_username or "github_user"
            final_username = base_username
            counter = 1

            while Users.objects.filter(username=final_username).exists():
                final_username = f"{base_username}_{counter}"
                counter += 1

            user = Users.objects.create(
                username=final_username,
                email=primary_email,
                password=hashed_password,
                provider="github",
                provider_id=github_id,
                github_username=github_username,
            )

    # 🔥 IMPORTANT: Always create fresh session (prevents board mix bug)
    token = secrets.token_hex(32)
    user.token = token
    user.save()

    # 🔥 ADD LOGIN TRACKING
    ip = request.META.get("REMOTE_ADDR")
    ua = request.META.get("HTTP_USER_AGENT")

    LoginActivity.objects.create(
    user=user,
    ip_address=ip,
    user_agent=ua
)

    response = redirect("http://localhost:3000/dashboard")
    response.set_cookie(
        key="session",
        value=token,
        path="/",
        httponly=True,
        secure=False,
        samesite="Lax",
        max_age=60 * 60 * 24 * 7,
    )
    return response


# =========================
# 🔥 GOOGLE OAUTH LOGIN
# =========================

def google_login(request):
    google_url = (
        "https://accounts.google.com/o/oauth2/v2/auth"
        f"?client_id={settings.GOOGLE_CLIENT_ID}"
        "&response_type=code"
        "&scope=openid email profile"
        "&redirect_uri=http://localhost:8000/user/auth/google/callback/"
    )
    return redirect(google_url)


def google_callback(request):
    code = request.GET.get("code")
    if not code:
        return JsonResponse({"error": "No code"}, status=400)

    token_res = requests.post(
        "https://oauth2.googleapis.com/token",
        data={
            "code": code,
            "client_id": settings.GOOGLE_CLIENT_ID,
            "client_secret": settings.GOOGLE_CLIENT_SECRET,
            "redirect_uri": "http://localhost:8000/user/auth/google/callback/",
            "grant_type": "authorization_code",
        },
    )

    token_json = token_res.json()
    access_token = token_json.get("access_token")

    user_res = requests.get(
        "https://www.googleapis.com/oauth2/v2/userinfo",
        headers={"Authorization": f"Bearer {access_token}"}
    )

    user_data = user_res.json()
    email = user_data.get("email")
    name = user_data.get("name")
    google_id = user_data.get("id")

    # 🔥 STEP 1: Exact Google account check
    user = Users.objects.filter(
        provider="google",
        provider_id=google_id
    ).first()

    # 🔥 STEP 2: Email match (CRITICAL)
    if not user:
        user = Users.objects.filter(email=email).first()

        if user:
            # Link Google to existing email account
            user.provider = "google"
            user.provider_id = google_id
            user.save()
        else:
            random_password = secrets.token_hex(16)
            hashed_password = createHash(random_password, "Encrypt@12345#")

            base_username = (name.replace(" ", "_") if name else "google_user")
            final_username = base_username
            counter = 1

            while Users.objects.filter(username=final_username).exists():
                final_username = f"{base_username}_{counter}"
                counter += 1

            user = Users.objects.create(
                username=final_username,
                email=email,
                password=hashed_password,
                provider="google",
                provider_id=google_id,
            )

    token = secrets.token_hex(32)
    user.token = token
    user.save()

    # 🔥 ADD LOGIN TRACKING
    ip = request.META.get("REMOTE_ADDR")
    ua = request.META.get("HTTP_USER_AGENT")

    LoginActivity.objects.create(
    user=user,
    ip_address=ip,
    user_agent=ua
)

    response = redirect("http://localhost:3000/dashboard")
    response.set_cookie(
        key="session",
        value=token,
        path="/",
        httponly=True,
        secure=False,
        samesite="Lax",
        max_age=60 * 60 * 24 * 7,
    )
    return response



def login_activity(request):
    token = request.COOKIES.get("session")
    user = Users.objects.filter(token=token).first()

    if not user:
        return JsonResponse({"error": "Unauthorized"}, status=401)

    logs = LoginActivity.objects.filter(user=user).order_by("-timestamp")[:100]

    data = {}
    for log in logs:
        day = log.timestamp.strftime("%Y-%m-%d")
        data[day] = data.get(day, 0) + 1

    return JsonResponse(data)




from datetime import date , timedelta

@csrf_exempt
def track_visit(request):
    token = request.COOKIES.get("session")
    user = Users.objects.filter(token=token).first()

    if not user:
        return JsonResponse({"error": "Unauthorized"}, status=401)

    try:
        data = json.loads(request.body)
        duration = int(data.get("duration", 0))
    except:
        duration = 0

    today = date.today()


    seven_days_ago = today - timedelta(days=6)
    SiteVisit.objects.filter(user=user, date__lt=seven_days_ago).delete()

    

    obj, created = SiteVisit.objects.get_or_create(
    user=user,
    date=today,
    defaults={"duration": 0}
)


    obj.duration += duration
    obj.save()

    
    return JsonResponse({"status": "ok"})



def usage_stats(request):
    token = request.COOKIES.get("session")
    user = Users.objects.filter(token=token).first()

    if not user:
        return JsonResponse({"error": "Unauthorized"}, status=401)

    today = date.today()
    seven_days_ago = today - timedelta(days=6)

    # 🔥 DELETE OLD DATA (AUTO CLEAN)
    SiteVisit.objects.filter(user=user, date__lt=seven_days_ago).delete()

    # 🔥 GET LAST 7 DAYS ONLY
    visits = SiteVisit.objects.filter(
        user=user,
        date__gte=seven_days_ago
    ).order_by("date")

    result = [
        {
            "date": str(v.date),
            "duration": v.duration
        }
        for v in visits
    ]

    return JsonResponse(result, safe=False)




