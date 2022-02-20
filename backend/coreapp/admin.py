from django.contrib import admin

import shutil

from .models.profile import Profile
from .models.scratch import Assembly, Asm, Scratch, CompilerConfig
from .models.project import Project, ProjectMember, ProjectFunction, ProjectImportConfig
from .models.github import GitHubUser, GitHubRepo, GitHubRepoBusyException


class GitHubRepoAdmin(admin.ModelAdmin[GitHubRepo]):
    actions = ["pull", "reclone"]

    def pull(self, request, queryset):
        for repo in queryset.all():
            repo.pull()

    def reclone(self, request, queryset):
        for repo in queryset.all():
            if repo.is_pulling:
                raise GitHubRepoBusyException()

            repo.last_pulled = None
            shutil.rmtree(repo.get_dir())
            repo.pull()


admin.site.register(Profile)
admin.site.register(GitHubUser)
admin.site.register(Asm)
admin.site.register(Assembly)
admin.site.register(Scratch)
admin.site.register(CompilerConfig)
admin.site.register(Project)
admin.site.register(ProjectFunction)
admin.site.register(ProjectMember)
admin.site.register(ProjectImportConfig)
admin.site.register(GitHubRepo, GitHubRepoAdmin)
