import json
import random
from pathlib import Path
from typing import Tuple

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

    def is_staff(self) -> bool:
        return self.user is not None and self.user.is_staff

    def __str__(self) -> str:
        if self.user:
            return self.user.username
        elif self.pseudonym:
            return f"{self.pseudonym} (anon)"
        else:
            return str(self.id)

    def get_frog_color(self) -> Tuple[float, float, float]:
        """Use the ID of this profile to generate a random color for use in a frog profile picture"""
        prev_state = random.getstate()
        random.seed(self.id)

        hue = random.uniform(0, 360)
        satuation = random.uniform(0.35, 0.65)
        lightness = random.uniform(0.35, 0.65)

        random.setstate(prev_state)

        return (hue, satuation, lightness)

    def is_online(self) -> bool:
        if self.last_request_date is None:
            return False
        delta = timezone.now() - self.last_request_date

        # 2 mins
        return delta.total_seconds() < (60 * 2)
