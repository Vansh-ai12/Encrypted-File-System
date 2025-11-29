import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

from user.models import Users
from .models import OrganisationModel, memberDetailModel

@csrf_exempt
def addOrganisation(request):

    if request.method != "POST":
        return JsonResponse({"error": "Invalid request method"}, status=405)

    # 🟣 Read request.FILES + request.POST instead of JSON
    org_name = request.POST.get("organisationName")
    slug = request.POST.get("slug")
    emailM = request.POST.get("emailM")
    role_for_invited = request.POST.get("role", "member")
    img_file = request.FILES.get("imgUrl")  # 👈 Image upload

    token = request.COOKIES.get("session")
    if not token:
        return JsonResponse({"error": "Unauthorized"}, status=401)

    userD = Users.objects.filter(token=token).first()
    if not userD:
        return JsonResponse({"error": "User not found"}, status=404)

    if not org_name or not slug:
        return JsonResponse({"error": "organisationName & slug required"}, status=400)

    if OrganisationModel.objects.filter(slug=slug).exists():
        return JsonResponse({"error": "Slug already exists"}, status=409)

    # Create organization with image
    organisation = OrganisationModel.objects.create(
        organisationName=org_name,
        slug=slug,
        user=userD,
        imgUrl=img_file  # 👈 Important - store image file
    )

    memberDetailModel.objects.create(
        organisation=organisation,
        memberName=userD.username,
        memberInfo=userD,
        role="admin"
    )

    # If invited email exists, create membership
    if emailM:
        invited_user = Users.objects.filter(email=emailM).first()
        if invited_user:
            if role_for_invited not in ["admin", "member"]:
                return JsonResponse({"error": "Invalid role"}, status=400)

            memberDetailModel.objects.create(
                organisation=organisation,
                memberName=invited_user.username,
                memberInfo=invited_user,
                role=role_for_invited
            )

    # Final JSON response (image included)
    return JsonResponse({
        "message": "Organisation created successfully",
        "organisationId": organisation.organisationId,
        "organisationName": organisation.organisationName,
        "slug": organisation.slug,
        "imgUrl": organisation.imgUrl.url if organisation.imgUrl else None
    }, status=201)


@csrf_exempt
def addMember(request):

    if request.method != "POST":
        return JsonResponse({"error": "Invalid request method"}, status=405)

   
    try:
        data = json.loads(request.body)
    except:
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    emailM = data.get("email")
    orgId = data.get("orgId")
    roleN = data.get("role", "member")  

    if not emailM or not orgId:
        return JsonResponse({"error": "email or orgId missing"}, status=400)

 
    invited_user = Users.objects.filter(email=emailM).first()
    if not invited_user:
        return JsonResponse({"error": "User with this email does not exist"}, status=404)

 
    organisation = OrganisationModel.objects.filter(organisationId=orgId).first()
    if not organisation:
        return JsonResponse({"error": "Organisation not found"}, status=404)

    if roleN not in ["admin", "member"]:
        return JsonResponse({"error": "Invalid role"}, status=400)


    if memberDetailModel.objects.filter(
        organisation=organisation, memberName=invited_user.username
    ).exists():
        return JsonResponse({"error": "User already a member"}, status=409)

    memberDetailModel.objects.create(
        organisation=organisation,
        memberName=invited_user.username,
        role=roleN
    )

    return JsonResponse(
        {
            "message": "Member added successfully",
            "organisationId": organisation.organisationId,
            "member": invited_user.username,
            "role": roleN
        },
        status=201
    )
@csrf_exempt
def getUserOrganisations(request):

    token = request.COOKIES.get("session")
    if not token:
        return JsonResponse({"error": "Unauthorized"}, status=401)

    user = Users.objects.filter(token=token).first()
    if not user:
        return JsonResponse({"error": "User not found"}, status=404)

    final_list = []

    # 1️⃣ Organisations owned by the user
    owned_orgs = OrganisationModel.objects.filter(user=user)
    for org in owned_orgs:
        members = memberDetailModel.objects.filter(organisation=org)
        members_data = [
            {
                "memberName": m.memberName,
                "memberEmail": m.memberInfo.email if m.memberInfo else None,
                "role": m.role,
            }
            for m in members
        ]

        final_list.append({
            "organisationId": org.organisationId,
            "organisationName": org.organisationName,
            "slug": org.slug,
            "imgUrl": org.imgUrl.url if org.imgUrl else None,  # 🔥 imageUrl added
            "myRole": "admin",
            "members": members_data,
        })

    # 2️⃣ Organisations where user is a member
    member_entries = memberDetailModel.objects.filter(memberInfo=user)
    for entry in member_entries:
        org = entry.organisation

        # Skip if this organisation is already in list
        if any(obj["organisationId"] == org.organisationId for obj in final_list):
            continue

        members = memberDetailModel.objects.filter(organisation=org)
        members_data = [
            {
                "memberName": m.memberName,
                "memberEmail": m.memberInfo.email if m.memberInfo else None,
                "role": m.role,
            }
            for m in members
        ]

        final_list.append({
            "organisationId": org.organisationId,
            "organisationName": org.organisationName,
            "slug": org.slug,
            "imgUrl": org.imgUrl.url if org.imgUrl else None,  # 🔥 included here too
            "myRole": entry.role,
            "members": members_data,
        })

    # Always return success even if list is empty
    return JsonResponse({"organisations": final_list}, status=200)



@csrf_exempt
def getOrganisationMembers(request, orgId):
    token = request.COOKIES.get("session")
    if not token:
        return JsonResponse({"error": "Unauthorized"}, status=401)

    user = Users.objects.filter(token=token).first()
    if not user:
        return JsonResponse({"error": "User not found"}, status=404)

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


@csrf_exempt
def updateMemberRole(request):
    try:
        data = json.loads(request.body)
    except:
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    token = request.COOKIES.get("session")
    if not token:
        return JsonResponse({"error": "Unauthorized"}, status=401)

    user = Users.objects.filter(token=token).first()

    orgId = data.get("orgId")
    email = data.get("email")
    newRole = data.get("role")

    if newRole not in ["admin", "member"]:
        return JsonResponse({"error": "Invalid role"}, status=400)

    org = OrganisationModel.objects.filter(organisationId=orgId).first()
    if not org:
        return JsonResponse({"error": "Organisation not found"}, status=404)

  
    adminCheck = memberDetailModel.objects.filter(
        organisation=org, memberInfo=user, role="admin"
    ).exists()

    if not adminCheck:
        return JsonResponse({"error": "No admin permission"}, status=403)

    member = memberDetailModel.objects.filter(
        organisation=org, memberInfo__email=email
    ).first()

    if not member:
        return JsonResponse({"error": "Member not found"}, status=404)

    member.role = newRole
    member.save()

    return JsonResponse({"message": "Role updated"}, status=200)

@csrf_exempt
def removeMember(request):
    try:
        data = json.loads(request.body)
    except:
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    token = request.COOKIES.get("session")
    if not token:
        return JsonResponse({"error": "Unauthorized"}, status=401)

    user = Users.objects.filter(token=token).first()

    orgId = data.get("orgId")
    email = data.get("email")

    org = OrganisationModel.objects.filter(organisationId=orgId).first()
    if not org:
        return JsonResponse({"error": "Organisation not found"}, status=404)

    adminCheck = memberDetailModel.objects.filter(
        organisation=org, memberInfo=user, role="admin"
    ).exists()

    if not adminCheck:
        return JsonResponse({"error": "No admin permission"}, status=403)

    member = memberDetailModel.objects.filter(
        organisation=org, memberInfo__email=email
    ).first()

    if not member:
        return JsonResponse({"error": "User not found in org"}, status=404)

    member.delete()
    return JsonResponse({"message": "Member removed"}, status=200)
