# decomp.me
A collaborative decompilation and reverse engineering platform

## Design
https://docs.google.com/document/d/19SjmFkjnxYEq5CXsuwiCcXetx07Z04b0QWRgRq_WjzM/edit?usp=sharing

## Contributing
PostgreSQL and Python are the main runtime dependencies required. Credentials for a test environment can be found in the main app settings file.

### Directory structure
`frontend/` contains the website sourcecode
`backend/` contains the Django project

### Frontend

You'll need [Yarn](https://yarnpkg.com/getting-started/install) (which requires Node.js).

To install front-end dependencies:
```
cd frontend
yarn
```

Start a development webserver hosting the site:
```
yarn start
```
