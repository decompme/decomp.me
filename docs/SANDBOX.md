### Sandbox jail

There is support for running subprocesses within [`nsjail`](https://github.com/google/nsjail).

This is controlled by the `SANDBOX` settings, and is enabled by default inside the `cromper` Docker container.

### AppArmor on Docker hosts

The Cromper Docker service uses the `decompme-cromper` AppArmor profile to permit nsjail's unprivileged user namespaces while leaving the host-wide AppArmor restrictions enabled. Load the profile on each Docker host before starting or recreating Cromper:

```sh
sudo install -o root -g root -m 0644 cromper/apparmor/decompme-cromper /etc/apparmor.d/decompme-cromper
sudo apparmor_parser -r /etc/apparmor.d/decompme-cromper
```

The profile is loaded again by AppArmor at boot from `/etc/apparmor.d`. Docker Compose attaches it to the Cromper container by name.

To enable it locally outside of the Docker container:

- Build or install `nsjail` locally. Example instructions for Ubuntu:
    - `apt-get install autoconf bison flex gcc g++ git libprotobuf-dev libnl-route-3-dev libtool make pkg-config protobuf-compiler`
    - `git clone --recursive --branch=3.0 https://github.com/google/nsjail`
    - `cd nsjail && make`
- Enable `unprivileged_userns_clone`
    - Temporary: `sudo sysctl -w kernel.unprivileged_userns_clone=1`
    - Permanent: `echo 'kernel.unprivileged_userns_clone=1' | sudo tee -a /etc/sysctl.d/00-local-userns.conf && sudo service procps restart`

- Edit `.env.local`:
    - Set `SANDBOX_NSJAIL_BIN_PATH` to the absolute path of the `nsjail` binary built above
