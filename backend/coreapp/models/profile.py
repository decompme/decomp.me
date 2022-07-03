from typing import Optional

from django.contrib.auth.models import User
from django.db import models
from django.utils import timezone


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

    def __str__(self) -> str:
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

    def is_online(self) -> bool:
        delta = timezone.now() - self.last_request_date

        # 2 mins
        return delta.total_seconds() < (60 * 2)
