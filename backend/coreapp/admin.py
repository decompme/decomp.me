import shutil

from django.contrib import admin

from django.db.models.query import QuerySet

from coreapp.middleware import Request

from .models.github import GitHubRepo, GitHubRepoBusyException, GitHubUser

from .models.profile import Profile
from .models.project import Project, ProjectFunction, ProjectMember
from .models.scratch import Asm, Assembly, CompilerConfig, Scratch
from .models.course import Course, CourseChapter, CourseScenario


class GitHubRepoAdmin(admin.ModelAdmin[GitHubRepo]):
    actions = ["pull", "reclone"]

    def pull(self, request: Request, queryset: QuerySet[GitHubRepo]) -> None:
        for repo in queryset.all():
            repo.pull()

    def reclone(self, request: Request, queryset: QuerySet[GitHubRepo]) -> None:
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
admin.site.register(GitHubRepo, GitHubRepoAdmin)
admin.site.register(Course)
admin.site.register(CourseChapter)
admin.site.register(CourseScenario)
