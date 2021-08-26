from django.utils.crypto import get_random_string

from django.db import models

def gen_scratch_id() -> str:
    ret = get_random_string(length=5)

    if Scratch.objects.filter(slug=ret).exists():
        return gen_scratch_id()

    return ret

class Profile(models.Model):
    pass

class Asm(models.Model):
    hash = models.CharField(max_length=64, primary_key=True)
    data = models.TextField()

    def __str__(self):
        return self.data if len(self.data) < 20 else self.data[:17] + "..."

class Assembly(models.Model):
    hash = models.CharField(max_length=64, primary_key=True)
    time = models.DateTimeField(auto_now_add=True)
    arch = models.CharField(max_length=100)
    as_opts = models.TextField(max_length=1000, blank=True, null=True)
    source_asm = models.ForeignKey(Asm, on_delete=models.CASCADE)
    elf_object = models.BinaryField(blank=True)

class Compilation(models.Model):
    hash = models.CharField(max_length=64, primary_key=True)
    time = models.DateTimeField(auto_now_add=True)
    compiler = models.CharField(max_length=100)
    cc_opts = models.TextField(max_length=1000, blank=True, null=True)
    source_code = models.TextField()
    context = models.TextField(blank=True)
    elf_object = models.BinaryField(blank=True)
    stderr = models.TextField(blank=True, null=True)

class Scratch(models.Model):
    slug = models.SlugField(primary_key=True, default=gen_scratch_id)
    creation_time = models.DateTimeField(auto_now_add=True)
    last_updated = models.DateTimeField(auto_now=True)
    compiler = models.CharField(max_length=100, blank=True)
    cc_opts = models.TextField(max_length=1000, blank=True, null=True)
    target_assembly = models.ForeignKey(Assembly, on_delete=models.CASCADE)
    source_code = models.TextField(blank=True)
    context = models.TextField(blank=True)
    original_context = models.TextField(blank=True)
    parent = models.ForeignKey("self", null=True, blank=True, on_delete=models.CASCADE)
    owner = models.ForeignKey(Profile, null=True, blank=True, on_delete=models.SET_NULL)

    def __str__(self):
        return self.slug
