from django.db import models
from django.utils.crypto import get_random_string
from .profile import Profile
from .scratch import Scratch


def gen_comment_id() -> str:
    return get_random_string(length=32)


class Comment(models.Model):
    slug = models.SlugField(primary_key=True, default=gen_comment_id)
    scratch = models.ForeignKey(
        Scratch, null=False, blank=False, on_delete=models.SET_NULL)
    owner = models.ForeignKey(
        Profile, null=False, blank=False, on_delete=models.SET_NULL)
    text = models.TextField(max_length=5000)
    creation_time = models.DateTimeField(auto_now_add=True)
    # TODO: Add replies
    # TODO: Add last_updated for editing

    class Meta:
        ordering = ["-creation_time"]

    def __str__(self) -> str:
        return self.slug
