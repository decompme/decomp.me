### GitHub authentication

- [Register a new OAuth application](https://github.com/settings/applications/new)
    - "Homepage URL" should be the URL you access the frontend on (e.g. `http://localhost:8080`)
    - "Authorization callback URL" should be the same as the homepage URL, but with `/login` appended

- Edit `.env.local`:
    - Set `GITHUB_CLIENT_ID` to the application client ID
    - Set `GITHUB_CLIENT_SECRET` to the application client secret (do **not** share this)
