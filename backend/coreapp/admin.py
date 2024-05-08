from django.contrib import admin

from .models.comment import Comment
from .models.course import Course, CourseChapter, CourseScenario
from .models.github import GitHubUser
from .models.preset import Preset
from .models.profile import Profile
from .models.project import Project, ProjectMember
from .models.scratch import (
    Asm,
    Assembly,
    AssemblyAdmin,
    CompilerConfig,
    Scratch,
    ScratchAdmin,
)

admin.site.register(Profile)
admin.site.register(GitHubUser)
admin.site.register(Asm)
admin.site.register(Assembly, AssemblyAdmin)
admin.site.register(Scratch, ScratchAdmin)
admin.site.register(CompilerConfig)
admin.site.register(Preset)
admin.site.register(Project)
admin.site.register(ProjectMember)
admin.site.register(Course)
admin.site.register(CourseChapter)
admin.site.register(CourseScenario)
admin.site.register(Comment)
