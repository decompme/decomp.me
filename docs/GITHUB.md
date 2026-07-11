### GitHub authentication

1. [Register a new OAuth application](https://github.com/settings/applications/new).

   - Set **Homepage URL** to `http://localhost`.
   - Set **Authorization callback URL** to `http://localhost/login`.
   - If you have modified the nginx config, or are running the site on a different host or port, use that URL instead and append `/login` for the callback.

2. Edit `backend/docker.dev.env`:

   - Set `GITHUB_CLIENT_ID` to the OAuth application client ID.
   - Set `GITHUB_CLIENT_SECRET` to the OAuth application client secret. Do not share this value.

3. Edit `.env`:

   - Set `GITHUB_CLIENT_ID` to the OAuth application client ID. The frontend uses this to show the GitHub login button.
   - You do not need to set `GITHUB_CLIENT_SECRET` here.

4. Restart the frontend and backend services so both environment files are reloaded.

### Making a user an admin

After signing in with GitHub, you can make your user an admin from the backend container:

```sh
docker compose exec backend uv run python manage.py shell
```

Then run:

```py
from django.contrib.auth.models import User

user = User.objects.get(username="your_github_username")
user.is_staff = True
user.is_superuser = True
user.save()
```

You can then access the Django admin interface at `/admin`.
