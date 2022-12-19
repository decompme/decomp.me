from typing import TypeVar, Any, Type
from django.db import models

import logging

logger = logging.getLogger(__name__)


# https://github.com/typeddjango/django-stubs/blob/b0edae31f50efab880aab98bb3f5ce0ca32fe306/django-stubs/db/models/fields/related.pyi#L31-L34
_ST = TypeVar("_ST")
_GT = TypeVar("_GT")


class CloneOnWriteField(models.ForeignKey[_ST, _GT]):
    """
    A ForeignKey that clones the related object when it is modified if
    it is shared with other objects.
    """

    _related_name: str

    def __init__(self, *args: Any, **kwargs: Any):
        super().__init__(*args, **kwargs)

        self._related_name = str(kwargs.get("related_name", self.name))

        # check that there is a related name and it does not end with +
        if self._related_name.endswith("+"):
            raise TypeError(
                "CloneOnWriteField does not support related_name ending with '+'"
            )

    def contribute_to_class(
        self, cls: Type[models.Model], name: str, private_only: bool = False
    ) -> None:
        super().contribute_to_class(cls, name, private_only)

        def clone_on_write(
            sender: Type[models.Model],
            instance: "CloneOnWriteField[_ST, _GT]",
            **kwargs: Any,
        ) -> None:
            related = getattr(instance, self.name)
            if related is None:
                return

            # If the related object is shared with other objects, clone it
            # and replace the foreign key with the clone.
            refcount = related.__class__.objects.filter(
                **{self._related_name: related}
            ).count()
            if refcount > 1:
                logger.info(
                    f"Cloning {related} for {instance} because it has refcount {refcount}"
                )
                related.pk = None
                related.save()
                setattr(instance, self.name, related)

        models.signals.pre_save.connect(clone_on_write, sender=cls)
