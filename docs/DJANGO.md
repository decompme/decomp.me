# Django

## shell

Ad-hoc queries against the database using the shell

```sh
$ uv run /backend/manage.py shell
```

```python
from django.apps import apps
Scratch = apps.get_model("coreapp", "Scratch")
Scratch.objects.filter(max_score=0)
# <QuerySet [<Scratch: A797J>, <Scratch: LjbwS>...
```

### Delete Scratches for particular owner

```py
>>> from django.apps import apps
>>> Scratch = apps.get_model("coreapp", "Scratch")
>>> qs = Scratch.objects.filter(owner_id=8782216)
>>> qs.count()
25
>>> list(qs.values_list("slug", "name"))
[('JHE1c', 'Untitled'), ('txWL3', 'Untitled'), ('sra8b', 'Untitled'), ('DR4qv', 'Untitled'), ('y5W4e', 'Untitled'), ('XIzNi', 'Untitled'), ('md41g', 'Untitled'), ('NLZ8f', 'Untitled'), ('kjhOv', 'Untitled'), ('bRHPg', 'Untitled'), ('xg2Gn', 'Untitled'), ('IJEAU', 'Untitled'), ('0BpDC', 'Untitled'), ('U34I7', 'Untitled'), ('hhpcJ', 'Untitled'), ('qFEhb', 'Untitled'), ('Amca6', 'Untitled'), ('6eeZJ', 'Untitled'), ('QHZhs', 'Untitled'), ('mBMq9', 'Untitled'), ('R3m2z', 'Untitled'), ('wLaRg', 'Untitled'), ('E0dXp', 'Untitled'), ('P2d3O', 'Untitled'), ('PGjmW', 'Untitled')]
>>> qs.delete()
(25, {'coreapp.Scratch': 25})
```


### Make existing user an admin

```py
from django.contrib.auth import get_user_model

User = get_user_model()
user = User.objects.get(username="mkst")

user.set_password("password-here")
user.is_staff = True
user.is_superuser = True
user.save()
```
