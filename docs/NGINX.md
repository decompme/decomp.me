### Running inside an nginx proxy

Running decomp.me using nginx as a proxy better emulates the production environment and can avoid cookie-related issues.

- Install nginx

- Create an nginx site configuration (typically `/etc/nginx/sites-available/decomp.local`)
```nginx
server {
    listen 80;
    listen [::]:80;
    client_max_body_size 5M;

    server_name decomp.local www.decomp.local;

    location / {
        try_files $uri @proxy_frontend;
    }

    location /api {
        try_files $uri @proxy_api;
    }
    location /admin {
        try_files $uri @proxy_api;
    }
    location /static {
        try_files $uri @proxy_api;
    }
    location /media {
        root /path/to/decomp.me/backend;
    }

    location @proxy_api {
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header X-Url-Scheme $scheme;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header Host $http_host;
        proxy_redirect off;
        proxy_pass http://127.0.0.1:8000;
    }

    location @proxy_frontend {
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header X-Url-Scheme $scheme;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header Host $http_host;
        proxy_redirect off;
        proxy_pass http://127.0.0.1:8080;
    }

    location /_next/webpack-hmr {
        proxy_pass http://127.0.0.1:8080/_next/webpack-hmr;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

- Enable the site
```shell
ln -s /etc/nginx/sites-available/decomp.local /etc/nginx/sites-enabled/decomp.local
```

- Add the following lines to `/etc/hosts`:
```
127.0.0.1	    decomp.local
127.0.0.1	    www.decomp.local
```

- Edit `.env.local`:
    - Set `API_BASE=/api`
    - Set `ALLOWED_HOSTS=decomp.local`

- If you set up GitHub authentication, change the application URLs to `http://decomp.local` and `http://decomp.local/login`

- Restart nginx, the frontend, and the backend

- Access the site via [http://decomp.local](http://decomp.local)
