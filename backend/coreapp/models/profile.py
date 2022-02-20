from django.db import models
from django.contrib.auth.models import User

from typing import Optional


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

    def get_html_url(self) -> Optional[str]:
        if self.user:
            return f"/u/{self.user.username}"
        else:
            # No URLs for anonymous profiles
            return None
