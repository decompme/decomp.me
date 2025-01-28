### Sandbox jail

There is support for running subprocesses within [`nsjail`](https://github.com/google/nsjail).

This is controlled by the `SANDBOX` settings, and is disabled by default in the development `.env`.

To enable it:

- Build or install `nsjail` locally. Example instructions for Ubuntu:
    - `apt-get install autoconf bison flex gcc g++ git libprotobuf-dev libnl-route-3-dev libtool make pkg-config protobuf-compiler`
    - `git clone --recursive --branch=3.0 https://github.com/google/nsjail`
    - `cd nsjail && make`
- Enable `unprivileged_userns_clone`
    - Temporary: `sudo sysctl -w kernel.unprivileged_userns_clone=1`
    - Permanent: `echo 'kernel.unprivileged_userns_clone=1' | sudo tee -a /etc/sysctl.d/00-local-userns.conf && sudo service procps restart`

- Edit `.env.local`:
    - Set `USE_SANDBOX_JAIL=on`
    - Set `SANDBOX_NSJAIL_BIN_PATH` to the absolute path of the `nsjail` binary built above
