from typing import Optional, Iterable
import os
import json
import random

from django.contrib.auth.models import User
from django.db import models
from django.utils import timezone

with open(os.path.join(os.path.dirname(__file__), "pseudonym_data.json")) as f:
    PSEUDONYM_DATA = json.load(f)
    # Preprocess our psue


def generate_pseudonym() -> str:
    """Generate a pseudonym for an anonymous user.
    Uses the data from https://github.com/danielvoweb/make-it-name, and a light modification on its generation method.
    Returns a name of the format "[Adjective] [Name of scientist / author]" (e.g. "Quirky Asimov")
    """
    adjective = random.choice(PSEUDONYM_DATA["adjectives"])
    person = random.choice(PSEUDONYM_DATA["people"])
    return f"{adjective.capitalize()} {person.capitalize()}"


class Profile(models.Model):
    creation_date = models.DateTimeField(auto_now_add=True)
    last_request_date = models.DateTimeField(auto_now_add=True)
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="profile",
        null=True,
    )
    pseudonym = models.CharField(max_length=150, blank=True)

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

    def save(
        self,
        force_insert: bool = False,
        force_update: bool = False,
        using: Optional[str] = None,
        update_fields: Optional[Iterable[str]] = None,
    ) -> None:
        if not self.user and not self.pseudonym:
            candidate = generate_pseudonym()
            while Profile.objects.filter(pseudonym=candidate).exists():
                candidate = generate_pseudonym()
            self.pseudonym = candidate

        super(Profile, self).save(force_insert, force_update, using, update_fields)
