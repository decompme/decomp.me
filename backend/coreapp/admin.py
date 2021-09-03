from django.contrib import admin

from .models import Profile, Assembly, Compilation, Asm, Scratch
from .github import GitHubUser

admin.site.register(Profile)
admin.site.register(GitHubUser)
admin.site.register(Asm)
admin.site.register(Assembly)
admin.site.register(Compilation)
admin.site.register(Scratch)
