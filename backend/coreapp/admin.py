from django.contrib import admin

import shutil

from .models import Profile, Assembly, Asm, Scratch, Project, ProjectFunction
from .github import GitHubUser, GitHubRepo

class GitHubRepoAdmin(admin.ModelAdmin[GitHubRepo]):
    actions = ["pull", "reclone"]

    def pull(self, request, queryset):
        for repo in queryset.all():
            repo.is_pulling = False
            repo.pull()

    def reclone(self, request, queryset):
        for repo in queryset.all():
            repo.is_pulling = False
            repo.last_pulled = None
            shutil.rmtree(repo.get_dir())
            repo.pull()

admin.site.register(Profile)
admin.site.register(GitHubUser)
admin.site.register(Asm)
admin.site.register(Assembly)
admin.site.register(Scratch)
admin.site.register(Project)
admin.site.register(ProjectFunction)
admin.site.register(GitHubRepo, GitHubRepoAdmin)
