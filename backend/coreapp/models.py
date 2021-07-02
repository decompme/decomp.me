import datetime

from django.db import models
from django.utils import timezone

class User(models.Model):
    username = models.CharField(max_length=30)

    def __str(self):
        return self.username

class Project(models.Model):
    slug = models.SlugField(max_length=50)
    name = models.CharField(max_length=200)
    creation_date = models.DateTimeField('creation date')
    repo_url = models.URLField(blank=True)
    discord_url = models.URLField(blank=True)

    def was_created_recently(self):
        return self.creation_date >= timezone.now() - datetime.timedelta(days=1)

    def __str__(self):
        return self.name

class Function(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE)
    name = models.CharField(max_length=200)
    fn_text = models.TextField()
    visits = models.IntegerField(default=0)

    def __str__(self):
        return self.name

class Submission(models.Model):
    function = models.ForeignKey(Function, on_delete=models.CASCADE)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    code = models.TextField()
    submission_time = models.DateTimeField('submission time')

    def __str__(self):
        return self.function.name
