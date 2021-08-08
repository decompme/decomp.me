import os

from django.conf import settings
from django.db import models

# TODO remove these after migrations are collapsed
def asm_objects_path():
    return settings.ASM_OBJECTS_PATH

def compilation_objects_path():
    return os.path.join(settings.LOCAL_FILE_DIR, 'compilations')

class Profile(models.Model):
    pass

class Asm(models.Model):
    hash = models.CharField(max_length=64, primary_key=True)
    data = models.TextField()

    def __str__(self):
        return self.data

class Assembly(models.Model):
    time = models.DateTimeField(auto_now_add=True)
    compiler = models.CharField(max_length=100)
    as_opts = models.TextField(max_length=1000, blank=True, null=True)
    source_asm = models.ForeignKey(Asm, on_delete=models.CASCADE)
    object = models.FilePathField(path=settings.ASM_OBJECTS_PATH)

class Compilation(models.Model):
    time = models.DateTimeField(auto_now_add=True)
    compiler = models.CharField(max_length=100)
    cpp_opts = models.TextField(max_length=1000, blank=True, null=True)
    as_opts = models.TextField(max_length=1000, blank=True, null=True)
    cc_opts = models.TextField(max_length=1000, blank=True, null=True)
    source_code = models.TextField()
    context = models.TextField(blank=True)
    object = models.FilePathField(path=settings.COMPILATION_OBJECTS_PATH)

class Scratch(models.Model):
    slug = models.SlugField(primary_key=True)
    creation_time = models.DateTimeField(auto_now_add=True)
    last_updated = models.DateTimeField(auto_now=True)
    compiler = models.CharField(max_length=100)
    cpp_opts = models.TextField(max_length=1000, blank=True, null=True)
    as_opts = models.TextField(max_length=1000, blank=True, null=True)
    cc_opts = models.TextField(max_length=1000, blank=True, null=True)
    target_assembly = models.ForeignKey(Assembly, on_delete=models.CASCADE)
    source_code = models.TextField(blank=True)
    context = models.TextField(blank=True)
    original_context = models.TextField(blank=True)
    parent = models.ForeignKey("self", null=True, blank=True, on_delete=models.CASCADE)
    owner = models.ForeignKey(Profile, null=True, blank=True, on_delete=models.SET_NULL)

    def __str__(self):
        return self.slug
