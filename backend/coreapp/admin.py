from django.contrib import admin

from .models.course import Course, CourseChapter, CourseScenario
from .models.github import GitHubUser
from .models.profile import Profile
from .models.project import Project, ProjectFunction, ProjectMember
from .models.scratch import Asm, Assembly, CompilerConfig, Scratch

admin.site.register(Profile)
admin.site.register(GitHubUser)
admin.site.register(Asm)
admin.site.register(Assembly)
admin.site.register(Scratch)
admin.site.register(CompilerConfig)
admin.site.register(Project)
admin.site.register(ProjectFunction)
admin.site.register(ProjectMember)
admin.site.register(Course)
admin.site.register(CourseChapter)
admin.site.register(CourseScenario)
