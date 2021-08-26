# decomp.me
A collaborative decompilation and reverse engineering platform

## Contributing

### Directory structure
`frontend/` contains the website sourcecode

`backend/` contains the Django project

`.env` contains configuration

### Backend
A virtual environment like virtualenv is recommended for handling python dependencies.
You might have to use python3 instead of python for the following commands.
```shell
cd backend
python -m virtualenv venv
source venv/bin/activate
```
All the following commands need to be run inside the virtual environment.

Once the virtual environment is set up you can install the requirements
```shell
pip install -r requirements.txt
./tools/backend/compilers/download.sh
```

Set up the tables needed for the database:
```shell
python manage.py migrate
```

Load the dev database from the repo
```shell
python manage.py loaddata db.json
```

Run the backend server
```shell
python manage.py runserver
```
If you changed the database models, you'll need to make new migrations
```shell
python manage.py makemigrations
python manage.py migrate
```

#### Sandbox Jail

There is support for running subprocesses within [`nsjail`](https://github.com/google/nsjail).

This is controlled by the `SANDBOX` settings, and is disabled by default in the development `.env` but is enabled inside the `backend` Docker container.


To enable it locally outside of the Docker container:

- Build or install `nsjail` locally. Example instructions for Ubuntu:
    - `apt-get install autoconf bison flex gcc g++ git libprotobuf-dev libnl-route-3-dev libtool make pkg-config protobuf-compiler`
    - `git clone --recursive --branch=3.0 https://github.com/google/nsjail`
    - `cd nsjail && make`
- Enable `unprivileged_userns_clone`
    - Temporary: `sudo sysctl -w kernel.unprivileged_userns_clone=1`
    - Permanent: `echo 'kernel.unprivileged_userns_clone=1' | sudo tee -a /etc/sysctl.d/00-local-userns.conf && sudo service procps restart
`
- Edit `.env`:
    - Set `USE_SANDBOX_JAIL=on`
    - Set `SANDBOX_NSJAIL_BIN_PATH` to the absolute path of the `nsjail` binary built above

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

# License
decomp.me uses the MIT license. All dependencies may contain their own licenses, which decomp.me respects.
