from . import views
from django.urls import path,include

urlpatterns = [
    
    path("addOrganisation/",views.addOrganisation,name="add_organisation"),
    path("addMember/",views.addMember , name="add_ member"),
    path("getOrganisations/",views.getUserOrganisations, name="get_Organisations"),
    path("getOrganisationMembers/<str:orgId>/",views.getOrganisationMembers,name="getMembers"),
    path("updateRole/",views.updateMemberRole, name="updateRole"),
    path("removeMember/",views.removeMember,name="removeMember"),
    path("sendInvitation/", views.sendInvitation),
    path("getInvitations/<int:orgId>/", views.getInvitations),
    path("acceptInvitation/<uuid:token>/", views.acceptInvitation),
    path("getInvitations/<str:orgId>/", views.getInvitations, name="get_invitations"),
    path("deleteOrganisation/",views.deleteOrganisation,name="deleteOrganisation"),
    path("setActiveOrganisation/", views.setActiveOrganisation, name="set-active-organisation"),
]


