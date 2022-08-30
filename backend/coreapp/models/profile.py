from typing import Optional
from pathlib import Path
import json
import random

from django.contrib.auth.models import User
from django.db import models
from django.utils import timezone

with (Path(__file__).resolve().parent / "pseudonym_data.json").open() as f:
    PSEUDONYM_DATA = json.load(f)


def generate_pseudonym() -> str:
    """Generate a pseudonym for an anonymous user.
    Uses the data & method from https://raw.githubusercontent.com/poush/random-animal,
    returning a name of the form "[Adjective] [Animal]" - e.g. "Adorable Alligator"
    """
    adjective = random.choice(PSEUDONYM_DATA["adjectives"])
    animal = random.choice(PSEUDONYM_DATA["animals"])
    return f"{adjective} {animal}"


class Profile(models.Model):
    creation_date = models.DateTimeField(auto_now_add=True)
    last_request_date = models.DateTimeField(auto_now_add=True)
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="profile",
        null=True,
    )
    pseudonym = models.CharField(max_length=150, default=generate_pseudonym)

    def is_anonymous(self) -> bool:
        return self.user is None

    def __str__(self) -> str:
        if self.user:
            return self.user.username
        elif self.pseudonym:
            return f"{self.pseudonym} (anon)"
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
