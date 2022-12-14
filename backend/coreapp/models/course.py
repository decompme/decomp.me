from django.db import models

from coreapp.models.scratch import Scratch


class Course(models.Model):
    slug = models.SlugField(max_length=100, unique=True)
    name = models.CharField(max_length=500)
    description = models.TextField()

    def __str__(self) -> str:
        return self.name


class CourseChapter(models.Model):
    course = models.ForeignKey(
        Course, on_delete=models.CASCADE, related_name="chapters"
    )
    index = models.IntegerField()
    slug = models.SlugField(max_length=100)
    name = models.CharField(max_length=500)
    description = models.TextField()

    def __str__(self) -> str:
        return f"{self.course.name} - {self.name}"


class CourseScenario(models.Model):
    chapter = models.ForeignKey(
        CourseChapter, on_delete=models.CASCADE, related_name="scenarios"
    )
    index = models.IntegerField()
    slug = models.SlugField(max_length=100)
    name = models.CharField(max_length=500)
    content = models.TextField()
    scratch = models.ForeignKey(Scratch, on_delete=models.CASCADE)

    def __str__(self) -> str:
        return f"{self.chapter.course.name} - {self.chapter.name} - {self.name}"
