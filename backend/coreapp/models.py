from django.utils.crypto import get_random_string
from django.db import models
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _

from decompme.settings import FRONTEND_BASE

def gen_scratch_id() -> str:
    ret = get_random_string(length=5)

    if Scratch.objects.filter(slug=ret).exists():
        return gen_scratch_id()

    return ret

class Profile(models.Model):
    creation_date = models.DateTimeField(auto_now_add=True)
    last_request_date = models.DateTimeField(auto_now_add=True)
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="profile",
        null=True,
    )

    def is_anonymous(self) -> bool:
        return self.user is None

    def __str__(self):
        if self.user:
            return self.user.username
        else:
            return str(self.id)

    def get_html_url(self):
        if self.user:
            return f"{FRONTEND_BASE}/u/{self.user.username}"

class Asm(models.Model):
    hash = models.CharField(max_length=64, primary_key=True)
    data = models.TextField()

    def __str__(self):
        return self.data if len(self.data) < 20 else self.data[:17] + "..."

class Assembly(models.Model):
    hash = models.CharField(max_length=64, primary_key=True)
    time = models.DateTimeField(auto_now_add=True)
    arch = models.CharField(max_length=100)
    source_asm = models.ForeignKey(Asm, on_delete=models.CASCADE)
    elf_object = models.BinaryField(blank=True)

class Project(models.Model):
    slug = models.SlugField(primary_key=True)
    creation_time = models.DateTimeField(auto_now_add=True)
    repo = models.OneToOneField("GithubRepo", on_delete=models.PROTECT)
    icon_url = models.URLField(blank=False)

    def __str__(self):
        return self.slug

    def get_html_url(self):
        return f"{FRONTEND_BASE}/{self.slug}"

class Scratch(models.Model):
    slug = models.SlugField(primary_key=True, default=gen_scratch_id)
    name = models.CharField(max_length=512, default="Untitled", blank=False)
    description = models.TextField(max_length=5000, default="", blank=True)
    creation_time = models.DateTimeField(auto_now_add=True)
    last_updated = models.DateTimeField(auto_now=True)
    compiler = models.CharField(max_length=100)
    platform = models.CharField(max_length=100, blank=True)
    compiler_flags = models.TextField(max_length=1000, default="", blank=True)
    target_assembly = models.ForeignKey(Assembly, on_delete=models.CASCADE)
    source_code = models.TextField(blank=True)
    context = models.TextField(blank=True)
    diff_label = models.CharField(max_length=512, blank=True, null=True)
    score = models.IntegerField(default=-1)
    max_score = models.IntegerField(default=-1)
    parent = models.ForeignKey("self", null=True, blank=True, on_delete=models.CASCADE) # XXX: should be SET_NULL?
    owner = models.ForeignKey(Profile, null=True, blank=True, on_delete=models.SET_NULL) # XXX: should be CASCADE?

    class Meta:
        ordering = ['-creation_time']
        verbose_name_plural = "Scratches"

    def __str__(self):
        return self.slug

    # hash for etagging, might be better to add a field to the model that changes on every save
    def __hash__(self):
        return hash((
            self.slug, self.name, self.description,
            self.creation_time, self.last_updated,
            self.platform, self.compiler, self.compiler_flags,
            self.target_assembly, self.source_code,
            self.context,
            self.diff_label,
            self.score, self.max_score,
            self.parent,
            self.owner,
        ))

    def save(self, *args, **kwargs):
        # Scratches cannot be owned if they are a root function in a project
        if self.owner is not None and ProjectFunction.objects.filter(scratch=self).exists():
            self.owner = None

        super().save(*args, **kwargs)

    def get_html_url(self):
        return FRONTEND_BASE + "/scratch/" + self.slug

    def is_claimable(self) -> bool:
        return self.owner is None and not ProjectFunction.objects.filter(scratch=self).exists()

class ProjectFunction(models.Model):
    slug = models.SlugField(blank=False, null=False)
    project = models.ForeignKey(Project, on_delete=models.CASCADE)
    scratch = models.OneToOneField(Scratch, on_delete=models.CASCADE)
    creation_time = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["slug", "project"], name="unique_project_function")
        ]

    def get_html_url(self):
        return self.project.html_url() + "/" + self.function

    def __str__(self):
        return f"{self.slug} ({self.project})"
