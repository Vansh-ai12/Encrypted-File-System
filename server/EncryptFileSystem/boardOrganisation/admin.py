from django.contrib import admin

from .models import OrganisationModel , memberDetailModel,Invitation

# Register your models here.


admin.site.register(OrganisationModel)

admin.site.register(memberDetailModel)

admin.site.register(Invitation)
