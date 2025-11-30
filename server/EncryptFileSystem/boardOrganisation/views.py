import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from user.models import Users
from .models import Invitation, OrganisationModel, memberDetailModel
from django.core.mail import send_mail
from django.conf import settings
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated

# ------------------------
# Helpers
# ------------------------

def get_authenticated_user(request):
    token = request.COOKIES.get("session")
    return Users.objects.filter(token=token).first()





# ------------------------
# Create Organisation
# ------------------------



@csrf_exempt
def addMember(request):
    if request.method != "POST":
        return JsonResponse({"error": "Invalid request"}, status=405)

    data = json.loads(request.body)

    user = get_authenticated_user(request)
    email = data.get("email")
    orgId = data.get("orgId")
    role = data.get("role", "member")

    if not email or not orgId:
        return JsonResponse({"error": "Missing email or orgId"}, status=400)

    org = OrganisationModel.objects.filter(organisationId=orgId).first()
    if not org:
        return JsonResponse({"error": "Organisation not found"}, status=404)

    admin = memberDetailModel.objects.filter(
        organisation=org, memberInfo=user, role="admin"
    ).exists()

    if not admin:
        return JsonResponse({"error": "Not allowed"}, status=403)

    invited_user = Users.objects.filter(email=email).first()
    if not invited_user:
        return JsonResponse({"error": "User not registered"}, status=404)

    if memberDetailModel.objects.filter(
        organisation=org, memberInfo=invited_user
    ).exists():
        return JsonResponse({"error": "Already a member"}, status=409)

    memberDetailModel.objects.create(
        organisation=org,
        memberName=invited_user.username,
        memberInfo=invited_user,
        role=role
    )

    return JsonResponse({"message": "Member added successfully"}, status=201)





@csrf_exempt
def addOrganisation(request):
    if request.method != "POST":
        return JsonResponse({"error": "Invalid request"}, status=405)

    user = get_authenticated_user(request)
    if not user:
        return JsonResponse({"error": "Unauthorized"}, status=401)

    org_name = request.POST.get("organisationName")
    slug = request.POST.get("slug")
    emailInvite = request.POST.get("emailM")
    roleInvite = request.POST.get("role", "member")
    img_file = request.FILES.get("imgUrl")

    if not org_name or not slug:
        return JsonResponse({"error": "organisationName & slug required"}, status=400)

    if OrganisationModel.objects.filter(slug=slug).exists():
        return JsonResponse({"error": "Slug already exists"}, status=409)

    org = OrganisationModel.objects.create(
        organisationName=org_name,
        slug=slug,
        imgUrl=img_file
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

    return JsonResponse({
        "message": "Organisation created",
        "organisationId": org.organisationId,
        "activeOrgId": org.organisationId,
        "imgUrl": org.imgUrl.url if org.imgUrl else None
    }, status=201)


# ------------------------
# Set Active Organisation
# ------------------------
@csrf_exempt
def setActiveOrganisation(request):
    if request.method != "POST":
        return JsonResponse({"error": "Invalid request"}, status=405)

    user = get_authenticated_user(request)
    if not user:
        return JsonResponse({"error": "Unauthorized"}, status=401)

    data = json.loads(request.body)
    orgId = data.get("orgId")

    org = OrganisationModel.objects.filter(organisationId=orgId).first()
    if not org:
        return JsonResponse({"error": "Organisation not found"}, status=404)

    # Check membership
    isMember = memberDetailModel.objects.filter(
        organisation=org, memberInfo=user
    ).exists()
    if not isMember:
        return JsonResponse({"error": "You are not a member"}, status=403)

    user.activeOrganisation = org
    user.save()

    return JsonResponse({"message": "Active organisation updated", 
                         "activeOrgId": orgId}, status=200)

# ------------------------
# Get Organisations
# ------------------------

@csrf_exempt
def getUserOrganisations(request):
    user = get_authenticated_user(request)
    if not user:
        return JsonResponse({"error": "Unauthorized"}, status=401)

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
            ]
        })

    return JsonResponse({"organisations": organisations}, status=200)


# ------------------------
# Get Organisation Members
# ------------------------

@csrf_exempt
def getOrganisationMembers(request, orgId):
    user = get_authenticated_user(request)
    if not user:
        return JsonResponse({"error": "Unauthorized"}, status=401)

    org = OrganisationModel.objects.filter(organisationId=orgId).first()
    if not org:
        return JsonResponse({"error": "Organisation not found"}, status=404)

    members = memberDetailModel.objects.filter(organisation=org)

    return JsonResponse({
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
    data = json.loads(request.body)

    user = get_authenticated_user(request)
    orgId = data.get("orgId")
    email = data.get("email")
    newRole = data.get("role")

    if newRole not in ["admin", "member"]:
        return JsonResponse({"error": "Invalid role"}, status=400)

    org = OrganisationModel.objects.filter(organisationId=orgId).first()
    if not org:
        return JsonResponse({"error": "Organisation not found"}, status=404)

    admin = memberDetailModel.objects.filter(
        organisation=org, memberInfo=user, role="admin"
    ).exists()

    if not admin:
        return JsonResponse({"error": "Not allowed"}, status=403)

    member = memberDetailModel.objects.filter(
        organisation=org, memberInfo__email=email
    ).first()

    if not member:
        return JsonResponse({"error": "Member not found"}, status=404)

    member.role = newRole
    member.save()

    return JsonResponse({"message": "Role updated"}, status=200)


# ------------------------
# Remove Member
# ------------------------

@csrf_exempt
def removeMember(request):
    data = json.loads(request.body)

    user = get_authenticated_user(request)
    orgId = data.get("orgId")
    email = data.get("email")

    org = OrganisationModel.objects.filter(organisationId=orgId).first()
    if not org:
        return JsonResponse({"error": "Organisation not found"}, status=404)

    admin = memberDetailModel.objects.filter(
        organisation=org, memberInfo=user, role="admin"
    ).exists()

    if not admin:
        return JsonResponse({"error": "Not allowed"}, status=403)

    member = memberDetailModel.objects.filter(
        organisation=org, memberInfo__email=email
    ).first()

    if not member:
        return JsonResponse({"error": "Member not found"}, status=404)

    member.delete()
    return JsonResponse({"message": "Member removed"}, status=200)


# ------------------------
# Invitations
# ------------------------

@csrf_exempt
def getInvitations(request, orgId):
    user = get_authenticated_user(request)
    if not user:
        return JsonResponse({"error": "Unauthorized"}, status=401)

    org = OrganisationModel.objects.filter(organisationId=orgId).first()
    if not org:
        return JsonResponse({"error": "Organisation not found"}, status=404)

    invites = Invitation.objects.filter(organisation=org, accepted=False)

    return JsonResponse({
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
        return JsonResponse({"error": "Unauthorized"}, status=401)

    email = data.get("email")
    orgId = data.get("orgId")
    role = data.get("role", "member")

    org = OrganisationModel.objects.filter(organisationId=orgId).first()
    if not org:
        return JsonResponse({"error": "Organisation not found"}, status=404)

    admin = memberDetailModel.objects.filter(
        organisation=org, memberInfo=user, role="admin"
    ).exists()

    if not admin:
        return JsonResponse({"error": "Not allowed"}, status=403)

    invite = Invitation.objects.create(
        email=email, organisation=org, role=role
    )

    return JsonResponse({"message": "Invitation sent"}, status=200)


@csrf_exempt
def acceptInvitation(request, token):
    invite = Invitation.objects.filter(token=token, accepted=False).first()
    if not invite:
        return JsonResponse({"error": "Invalid token"}, status=400)

    user = Users.objects.filter(email=invite.email).first()

    if user:
        memberDetailModel.objects.create(
            organisation=invite.organisation,
            memberName=user.username,
            memberInfo=user,
            role=invite.role
        )
        invite.accepted = True
        invite.save()

        return JsonResponse({"message": "Joined organisation"}, status=200)

    return JsonResponse({"status": "new-user", "email": invite.email}, status=200)
@csrf_exempt
def deleteOrganisation(request):
    if request.method != "POST":
        return JsonResponse({"error": "Invalid request"}, status=405)

    user = get_authenticated_user(request)
    if not user:
        return JsonResponse({"error": "Unauthorized"}, status=401)

    data = json.loads(request.body)
    org_id = data.get("orgId")

    if not org_id:
        return JsonResponse({"error": "Organization ID required"}, status=400)

    org = OrganisationModel.objects.filter(organisationId=org_id).first()
    if not org:
        return JsonResponse({"error": "Organization not found"}, status=404)

    # Admin check
    is_admin = memberDetailModel.objects.filter(
        organisation=org,
        memberInfo=user,
        role="admin"
    ).exists()

    if not is_admin:
        return JsonResponse({"error": "Only admins can delete"}, status=403)

    # Reset active organisation for all users
    Users.objects.filter(activeOrganisation=org).update(activeOrganisation=None)

    # Delete members and invitations
    memberDetailModel.objects.filter(organisation=org).delete()
    Invitation.objects.filter(organisation=org).delete()

    # Finally delete org
    org.delete()

    return JsonResponse({"message": "Organization deleted successfully"}, status=200)
