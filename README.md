# decomp.me
A collaborative decompilation and reverse engineering platform

## Design
https://docs.google.com/document/d/19SjmFkjnxYEq5CXsuwiCcXetx07Z04b0QWRgRq_WjzM/edit?usp=sharing

## Contributing
PostgreSQL and Python are the main runtime dependencies required. Credentials for a test environment can be found in the main app settings file.

### Directory structure
`frontend/` contains the website sourcecode
`backend/` contains the Django project

### Backend
The backend requires a running PostgreSQL database.
A virtual environment like virtualenv is recommended for handling python dependencies.
You might have to use python3 instead of python here.
```shell
cd backend
python -m virtualenv venv
source venv/bin/activate
```
All the following commands need to be run inside the virtual environment.

Once the virtual environment is set up you can install the requirements and set up the database
```shell
pip install -r requirements.txt
python manage.py migrate
```
Create a superuser account to be able to use the admin interface
```shell
python manage.py createsuperuser
```
Run the backend server
```shell
COMPILER_BASE_PATH=$(pwd)/../compilers/ python manage.py runserver
```
If you changed the database models you need to make new migrations
```shell
python manage.py makemigrations
python manage.py migrate
```

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
