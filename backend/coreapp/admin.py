from django.contrib import admin

import shutil

from .models import Profile, Assembly, Asm, Scratch, Project, ProjectFunction
from .github import GitHubUser, GitHubRepo

class GitHubRepoAdmin(admin.ModelAdmin):
    actions = ["pull", "reclone"]

    @admin.action(description="Pull selected repos from GitHub")
    def pull(self, request, queryset):
        for repo in queryset.all():
            repo.is_pulling = False
            repo.pull()

    @admin.action(description="Reclone selected repos from GitHub")
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
