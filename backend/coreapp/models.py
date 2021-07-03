from django.db import models

class Compiler(models.Model):
    shortname = models.CharField(max_length=50, primary_key=True)
    name = models.CharField(max_length=100)

    def __str__(self):
        return self.name

class Assembly(models.Model):
    hash = models.CharField(max_length=64, primary_key=True)
    data = models.TextField()

    def __str__(self):
        return self.data

class Scratch(models.Model):
    slug = models.SlugField(primary_key=True)
    submission_time = models.DateTimeField()
    compiler = models.ForeignKey(Compiler, on_delete=models.CASCADE)
    assembly = models.ForeignKey(Assembly, on_delete=models.CASCADE)
    c_code = models.TextField()
    parent = models.ForeignKey("self", null=True, on_delete=models.CASCADE)
    owner = models.UUIDField()

    def __str__(self):
        return self.slug