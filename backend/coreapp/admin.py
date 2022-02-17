from django.contrib import admin

from .models.profile import Profile
from .models.scratch import Assembly, Asm, Scratch
from .models.github import GitHubUser

admin.site.register(Profile)
admin.site.register(GitHubUser)
admin.site.register(Asm)
admin.site.register(Assembly)
admin.site.register(Scratch)
