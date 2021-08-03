FROM python:3.9 AS build

RUN apt-get update && apt-get install -y netcat binutils-mips-linux-gnu

COPY requirements.txt /backend/requirements.txt

RUN python3 -m pip install -r /backend/requirements.txt --no-cache-dir

WORKDIR /backend

ENTRYPOINT ["/backend/docker_entrypoint.sh"]
