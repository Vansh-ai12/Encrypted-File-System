import json
from urllib import response
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

from user.models import Users
from .models import Invitation, OrganisationModel, memberDetailModel
from django.core.mail import send_mail
from django.conf import settings
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from EncryptFileSystem.utils import cors_json
from django.core.mail import send_mail
from django.urls import reverse
# ------------------------
# Helpers
# ------------------------

def get_authenticated_user(request):
    token = request.COOKIES.get("session")

    if not token:
        return None

    return Users.objects.filter(
        token=token
    ).select_related("activeOrganisation").first()



# ------------------------
# Create Organisation
# ------------------------



@csrf_exempt
def addMember(request):
    if request.method != "POST":
        return cors_json({"error": "Invalid request"}, status=405)

    data = json.loads(request.body)

    user = get_authenticated_user(request)
    email = data.get("email")
    orgId = data.get("orgId")
    role = data.get("role", "member")

    if not email or not orgId:
        return cors_json({"error": "Missing email or orgId"}, status=400)

    org = OrganisationModel.objects.filter(organisationId=orgId).first()
    if not org:
        return cors_json({"error": "Organisation not found"}, status=404)

    admin = memberDetailModel.objects.filter(
        organisation=org, memberInfo=user, role="admin"
    ).exists()

    if not admin:
        return cors_json({"error": "Not allowed"}, status=403)

    invited_user = Users.objects.filter(email=email).first()
    if not invited_user:
        return cors_json({"error": "User not registered"}, status=404)

    if memberDetailModel.objects.filter(
        organisation=org, memberInfo=invited_user
    ).exists():
        return cors_json({"error": "Already a member"}, status=409)

    memberDetailModel.objects.create(
        organisation=org,
        memberName=invited_user.username,
        memberInfo=invited_user,
        role=role
    )

    return cors_json({"message": "Member added successfully"}, status=201)





@csrf_exempt
def addOrganisation(request):
    if request.method != "POST":
        return cors_json({"error": "Invalid request"}, status=405)

    user = get_authenticated_user(request)
    if not user:
        return cors_json({"error": "Unauthorized"}, status=401)

    org_name = request.POST.get("organisationName")
    slug = request.POST.get("slug")
    emailInvite = request.POST.get("emailM")
    roleInvite = request.POST.get("role", "member")
    img_file = request.FILES.get("imgUrl")

    if not org_name or not slug:
        return cors_json({"error": "organisationName & slug required"}, status=400)

    if OrganisationModel.objects.filter(slug=slug).exists():
        return cors_json({"error": "Slug already exists"}, status=409)

    org = OrganisationModel.objects.create(
        organisationName=org_name,
        slug=slug,
        imgUrl=img_file,
        creator=user
    )

    # Add creator as admin
    memberDetailModel.objects.create(
        organisation=org,
        memberName=user.username,
        memberInfo=user,
        role="admin"
    )

    # OPTIONAL INVITE
    if emailInvite:
        invite_user = Users.objects.filter(email=emailInvite).first()
        if invite_user:
            memberDetailModel.objects.create(
                organisation=org,
                memberName=invite_user.username,
                memberInfo=invite_user,
                role=roleInvite
            )

    # Set as active org
    user.activeOrganisation = org
    user.save()

    return cors_json({
        "message": "Organisation created",
        "organisationId": org.organisationId,
        "activeOrgId": org.organisationId,
        "imgUrl": org.imgUrl.url if org.imgUrl else None,
        "creatorEmail": user.email,
    }, status=201)


# ------------------------
# Set Active Organisation
# ------------------------
@csrf_exempt
def setActiveOrganisation(request):
    if request.method != "POST":
        return cors_json({"error": "Invalid request"}, status=405)

    user = get_authenticated_user(request)
    if not user:
        return cors_json({"error": "Unauthorized"}, status=401)

    data = json.loads(request.body)
    orgId = data.get("orgId")

    org = OrganisationModel.objects.filter(organisationId=orgId).first()
    if not org:
        return cors_json({"error": "Organisation not found"}, status=404)

    # Check membership
    isMember = memberDetailModel.objects.filter(
        organisation=org, memberInfo=user
    ).exists()
    if not isMember:
        return cors_json({"error": "You are not a member"}, status=403)

    user.activeOrganisation = org
    user.save()

    return cors_json({"message": "Active organisation updated", 
                         "activeOrgId": orgId}, status=200)

# ------------------------
# Get Organisations
# ------------------------

@csrf_exempt
def getUserOrganisations(request):
    user = get_authenticated_user(request)
    if not user:
        return cors_json({"error": "Unauthorized"}, status=401)

    memberships = memberDetailModel.objects.filter(memberInfo=user)

    organisations = []
    for m in memberships:
        org = m.organisation
        org_members = memberDetailModel.objects.filter(organisation=org)

        organisations.append({
            "organisationId": org.organisationId,
            "organisationName": org.organisationName,
            "slug": org.slug,
            "imgUrl": org.imgUrl.url if org.imgUrl else None,
            "myRole": m.role,
            "members": [
                {
                    "username": mm.memberName,
                    "email": mm.memberInfo.email if mm.memberInfo else None,
                    "role": mm.role
                }
                for mm in org_members
            ],
            "creatorEmail": org.creator.email,

        })

    return cors_json({"organisations": organisations}, status=200)


# ------------------------
# Get Organisation Members
# ------------------------

@csrf_exempt
def getOrganisationMembers(request, orgId):
    user = get_authenticated_user(request)
    if not user:
        return cors_json({"error": "Unauthorized"}, status=401)

    org = OrganisationModel.objects.filter(organisationId=orgId).first()
    if not org:
        return cors_json({"error": "Organisation not found"}, status=404)

    members = memberDetailModel.objects.filter(organisation=org)

    return cors_json({
        "members": [
            {
                "username": m.memberName,
                "email": m.memberInfo.email if m.memberInfo else None,
                "joined": m.createdAt.strftime("%d/%m/%Y"),
                "role": m.role
            }
            for m in members
        ]
    }, status=200)


# ------------------------
# Role Update
# ------------------------

@csrf_exempt
def updateMemberRole(request):
    """
    Allowed: Only admins (caller) can update roles.
    BUT: You cannot change the role of any target member who is already an admin.
    (This enforces 'no one can demote admins'.)
    Promoting a member -> admin is allowed.
    """
    try:
        data = json.loads(request.body)
    except Exception:
        return cors_json({"error": "Invalid JSON"}, status=400)

    user = get_authenticated_user(request)
    if not user:
        return cors_json({"error": "Unauthorized"}, status=401)

    orgId = data.get("orgId")
    email = data.get("email")
    newRole = data.get("role")

    if newRole not in ["admin", "member"]:
        return cors_json({"error": "Invalid role"}, status=400)

    org = OrganisationModel.objects.filter(organisationId=orgId).first()
    if not org:
        return cors_json({"error": "Organisation not found"}, status=404)

    # caller must be admin
    caller_is_admin = memberDetailModel.objects.filter(
        organisation=org, memberInfo=user, role="admin"
    ).exists()
    if not caller_is_admin:
        return cors_json({"error": "Not allowed"}, status=403)

    member = memberDetailModel.objects.filter(
        organisation=org, memberInfo__email=email
    ).first()
    if not member:
        return cors_json({"error": "Member not found"}, status=404)

    # Disallow changing role of any member who is already admin.
    if member.role == "admin":
        return cors_json({"error": "Cannot change role of an admin"}, status=403)

    # OK to update (member -> admin or member -> member)
    member.role = newRole
    member.save()

    return cors_json({"message": "Role updated"}, status=200)


# ------------------------
# Remove Member
# ------------------------

@csrf_exempt
def removeMember(request):
    """
    Only an admin (caller) can remove members.
    Admins cannot be removed — removal of any admin is forbidden.
    """
    try:
        data = json.loads(request.body)
    except Exception:
        return cors_json({"error": "Invalid JSON"}, status=400)

    user = get_authenticated_user(request)
    if not user:
        return cors_json({"error": "Unauthorized"}, status=401)

    orgId = data.get("orgId")
    email = data.get("email")

    org = OrganisationModel.objects.filter(organisationId=orgId).first()
    if not org:
        return cors_json({"error": "Organisation not found"}, status=404)

    # caller must be admin
    caller_is_admin = memberDetailModel.objects.filter(
        organisation=org, memberInfo=user, role="admin"
    ).exists()
    if not caller_is_admin:
        return cors_json({"error": "Not allowed"}, status=403)

    member = memberDetailModel.objects.filter(
        organisation=org, memberInfo__email=email
    ).first()
    if not member:
        return cors_json({"error": "Member not found"}, status=404)

    # If target is admin -> forbid removal (Option 3)
    if member.role == "admin":
        return cors_json({"error": "Cannot remove an admin"}, status=403)

    member.delete()
    return cors_json({"message": "Member removed"}, status=200)


# ------------------------
# Invitations
# ------------------------

@csrf_exempt
def getInvitations(request, orgId):
    user = get_authenticated_user(request)
    if not user:
        return cors_json({"error": "Unauthorized"}, status=401)

    org = OrganisationModel.objects.filter(organisationId=orgId).first()
    if not org:
        return cors_json({"error": "Organisation not found"}, status=404)

    invites = Invitation.objects.filter(organisation=org, accepted=False)

    return cors_json({
        "invitations": [
            {
                "email": i.email,
                "role": i.role,
                "created_at": i.created_at.strftime("%d/%m/%Y"),
                "token": str(i.token),
            }
            for i in invites
        ]
    }, status=200)


@csrf_exempt
def sendInvitation(request):
    data = json.loads(request.body)

    user = get_authenticated_user(request)
    if not user:
        return cors_json({"error": "Unauthorized"}, status=401)

    email = data.get("email", "").strip().lower()
    orgId = data.get("orgId")
    role = data.get("role", "member")

    org = OrganisationModel.objects.filter(organisationId=orgId).first()
    if not org:
        return cors_json({"error": "Organisation not found"}, status=404)

    # Allow ANY member of the org to send invites
    is_member = memberDetailModel.objects.filter(
        organisation=org, memberInfo=user
    ).exists()
    if not is_member:
        return cors_json({"error": "User not a member of this organisation"}, status=403)

    invite = Invitation.objects.create(
        email=email, organisation=org, role=role
    )

    invite_link = f"http://127.0.0.1:3000/invite/{invite.token}"

    try:
        send_mail(
            subject="You're invited!",
            message=f"You are invited to join {org.organisationName}.\n"
                    f"Click below to join:\n{invite_link}",
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
            fail_silently=False,
        )
    except Exception as e:
        print("EMAIL FAILED:", e)

    return cors_json({"message": "Invitation sent"}, status=200)

@csrf_exempt
def acceptInvitation(request, token):
    # ✅ ALLOW PREFLIGHT
    if request.method == "OPTIONS":
        return cors_json({}, status=200)

    if request.method != "POST":
        return cors_json({"error": "Method not allowed"}, status=405)

    invite = Invitation.objects.filter(token=token, accepted=False).first()
    if not invite:
        return cors_json({"error": "Invalid or expired invitation"}, status=400)

    logged_user = get_authenticated_user(request)
    invited_user = Users.objects.filter(email=invite.email).first()

    if not logged_user and not invited_user:
        return cors_json({
            "status": "new-user",
            "email": invite.email
        }, status=200)

    user = logged_user if logged_user else invited_user
    org = invite.organisation

    memberDetailModel.objects.get_or_create(
        organisation=org,
        memberInfo=user,
        defaults={
            "memberName": user.username,
            "role": invite.role
        }
    )

    invite.accepted = True
    invite.save()

    user.activeOrganisation = org

# 🔥 ALWAYS SAVE
    user.save()

    response = cors_json({"message": "Joined organisation"}, status=200)

    if not logged_user:
        import secrets
        user.token = secrets.token_hex(32)
        user.save()

        response.set_cookie(
        key="session",
        value=user.token,
        path="/",
        httponly=True,
        secure=False,     # local dev
        samesite="Lax",
        max_age=60 * 60 * 24 * 7,
    )

    return response






@csrf_exempt
def deleteOrganisation(request):
    if request.method != "POST":
        return cors_json({"error": "Invalid request"}, status=405)

    user = get_authenticated_user(request)
    if not user:
        return cors_json({"error": "Unauthorized"}, status=401)

    data = json.loads(request.body)
    org_id = data.get("orgId")

    if not org_id:
        return cors_json({"error": "Organization ID required"}, status=400)

    org = OrganisationModel.objects.filter(organisationId=org_id).first()
    if not org:
        return cors_json({"error": "Organization not found"}, status=404)

    # Admin check
    is_admin = memberDetailModel.objects.filter(
        organisation=org,
        memberInfo=user,
        role="admin"
    ).exists()

    if not is_admin:
        return cors_json({"error": "Only admins can delete"}, status=403)

    # Reset active organisation for all users
    Users.objects.filter(activeOrganisation=org).update(activeOrganisation=None)

    # Delete members and invitations
    memberDetailModel.objects.filter(organisation=org).delete()
    Invitation.objects.filter(organisation=org).delete()

    # Finally delete org
    org.delete()

    return cors_json({"message": "Organization deleted successfully"}, status=200)
