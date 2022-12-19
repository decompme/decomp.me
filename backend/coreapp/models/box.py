"""
Boxed models. These wrap a simple datatype in a model, so that they can be
referenced through relations. All models here are abstract, and should be
inherited from to make a concrete model.
"""

from django.db import models


class TextModel(models.Model):
    text = models.TextField(default="", blank=True)

    def __str__(self) -> str:
        return self.text

    class Meta:
        abstract = True

    @staticmethod
    def default() -> "TextModel":
        model, created = TextModel.objects.get_or_create(text="")
        return model
