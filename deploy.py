#!/usr/bin/env python3
import argparse
import os
import re
import shlex
import subprocess
import sys
import time
from pathlib import Path

DEPLOY_ENV = Path(".deploy.env")
UPSTREAM_CONF = Path("nginx/production/runtime/upstream.conf")

DOCKER_COMPOSE = ["docker", "compose", "-f", "docker-compose.prod.yaml"]

SLOTS = {"blue", "green"}
INFRA_SERVICES = ["postgres", "nginx", "certbot"]
BLUE_TAG = "BLUE_TAG"
GREEN_TAG = "GREEN_TAG"
NGINX_TAG = "NGINX_TAG"
ACTIVE_SLOT = "ACTIVE_SLOT"
SLOT_COLORS = {
    "blue": "\033[34m",
    "green": "\033[32m",
}
RESET_COLOR = "\033[0m"


def run(cmd, *, env=None, check=True, capture=False, quiet=False):
    if not quiet:
        print("+", " ".join(shlex.quote(c) for c in cmd))
    return subprocess.run(
        cmd,
        env=env,
        check=check,
        text=True,
        capture_output=capture,
    )


def read_env_file():
    data = {}
    if DEPLOY_ENV.exists():
        for line in DEPLOY_ENV.read_text().splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            data[k.strip()] = v.strip()
    return data


def write_env_file(data):
    keys = [ACTIVE_SLOT, BLUE_TAG, GREEN_TAG, NGINX_TAG]
    lines = []

    for key in keys:
        if key in data:
            lines.append(f"{key}={data[key]}")

    for key in sorted(data):
        if key not in keys:
            lines.append(f"{key}={data[key]}")

    tmp = DEPLOY_ENV.with_suffix(".tmp")
    tmp.write_text("\n".join(lines) + "\n")
    tmp.replace(DEPLOY_ENV)


def compose_env(state):
    env = os.environ.copy()
    env.update(state)
    env.setdefault(BLUE_TAG, "latest")
    env.setdefault(GREEN_TAG, "latest")
    env.setdefault(NGINX_TAG, "latest")
    return env


def other_slot(slot):
    return "green" if slot == "blue" else "blue"


def colour_slot(slot):
    if not sys.stdout.isatty() or slot not in SLOT_COLORS:
        return slot
    return f"{SLOT_COLORS[slot]}{slot}{RESET_COLOR}"


def validate_tag(tag):
    if not re.fullmatch(r"[A-Za-z0-9._-]{6,128}", tag):
        raise SystemExit(f"Invalid image tag: {tag}")


def write_upstream(slot):
    UPSTREAM_CONF.parent.mkdir(parents=True, exist_ok=True)
    tmp = UPSTREAM_CONF.with_suffix(".conf.tmp")
    tmp.write_text(
        f"""upstream backend_upstream {{
    server backend-{slot}:8000;
}}

upstream frontend_upstream {{
    server frontend-{slot}:8080;
}}
"""
    )
    tmp.replace(UPSTREAM_CONF)


def switch_upstream(slot, env):
    previous = UPSTREAM_CONF.read_text() if UPSTREAM_CONF.exists() else None
    write_upstream(slot)

    try:
        nginx_test_and_reload(env)
    except Exception:
        print("nginx reload failed; restoring previous upstream config...")
        if previous is None:
            UPSTREAM_CONF.unlink(missing_ok=True)
        else:
            UPSTREAM_CONF.write_text(previous)

        nginx_test_and_reload(env)
        raise


def container_id(service, env):
    result = run(
        [*DOCKER_COMPOSE, "ps", "-q", service],
        env=env,
        capture=True,
    )
    cid = result.stdout.strip()
    if not cid:
        raise SystemExit(f"No container found for service: {service}")
    return cid


def health_status(service, env):
    cid = container_id(service, env)
    result = run(
        ["docker", "inspect", "-f", "{{.State.Health.Status}}", cid],
        env=env,
        capture=True,
        check=False,
    )
    if result.returncode != 0:
        return "unknown"
    return result.stdout.strip()


def service_health_for_status(service, env):
    result = run(
        [*DOCKER_COMPOSE, "ps", "-q", service],
        env=env,
        capture=True,
        check=False,
        quiet=True,
    )
    cid = result.stdout.strip()
    if not cid:
        return "missing"

    result = run(
        [
            "docker",
            "inspect",
            "-f",
            "{{.State.Status}} {{if .State.Health}}{{.State.Health.Status}}{{else}}no-healthcheck{{end}}",
            cid,
        ],
        env=env,
        capture=True,
        check=False,
        quiet=True,
    )
    if result.returncode != 0:
        return "unknown"
    return result.stdout.strip()


def wait_for_healthy(service, env, timeout=120):
    print(f"Waiting for {service} to become healthy...")
    deadline = time.time() + timeout

    while time.time() < deadline:
        status = health_status(service, env)
        print(f"  {service}: {status}")

        if status == "healthy":
            return

        if status == "unhealthy":
            raise SystemExit(f"{service} became unhealthy")

        if status == "unknown":
            # No healthcheck configured. Fall back to container running state.
            cid = container_id(service, env)
            result = run(
                ["docker", "inspect", "-f", "{{.State.Running}}", cid],
                env=env,
                capture=True,
            )
            if result.stdout.strip() == "true":
                print(f"  {service}: no healthcheck configured, container is running")
                return

        time.sleep(2)

    raise SystemExit(f"Timed out waiting for {service} to become healthy")


def nginx_fetch(url, env):
    cmd = [
        *DOCKER_COMPOSE,
        "exec",
        "-T",
        "nginx",
        "wget",
        "-q",
        "--spider",
        url,
    ]
    result = run(cmd, env=env, check=False)
    if result.returncode == 0:
        return

    raise SystemExit(f"nginx smoke test failed to reach {url}")


def smoke_test(slot, env):
    print(f"Smoke testing {slot} from nginx...")
    nginx_fetch(f"http://backend-{slot}:8000/api/healthz", env)
    nginx_fetch(f"http://frontend-{slot}:8080/healthz", env)


def nginx_test_and_reload(env):
    run([*DOCKER_COMPOSE, "exec", "-T", "nginx", "nginx", "-t"], env=env)
    run([*DOCKER_COMPOSE, "exec", "-T", "nginx", "nginx", "-s", "reload"], env=env)


def ensure_services(services, env):
    run([*DOCKER_COMPOSE, "up", "-d", "--no-recreate", *services], env=env)


def ensure_infra(env):
    ensure_services(INFRA_SERVICES, env)


def print_status(state, env):
    print("Deployment state:")
    active = state.get(ACTIVE_SLOT, "unknown")
    print(f"  active slot: {colour_slot(active)}")
    print(f"  blue tag:    {state.get(BLUE_TAG, 'unset')}")
    print(f"  green tag:   {state.get(GREEN_TAG, 'unset')}")
    print(f"  nginx tag:   {state.get(NGINX_TAG, 'latest')}")
    print()

    print("Slot health:")
    for slot in sorted(SLOTS):
        coloured_slot = colour_slot(slot)
        print(
            f"  backend-{coloured_slot}:  "
            f"{service_health_for_status(f'backend-{slot}', env)}"
        )
        print(
            f"  frontend-{coloured_slot}: "
            f"{service_health_for_status(f'frontend-{slot}', env)}"
        )
    print()

    run([*DOCKER_COMPOSE, "ps"], env=env, check=False)


def cmd_status(args):
    state = read_env_file()
    env = compose_env(state)
    print_status(state, env)


def cmd_deploy(args):
    validate_tag(args.tag)

    state = read_env_file()
    active = state.get(ACTIVE_SLOT, "blue")

    if args.slot == "auto":
        slot = other_slot(active)
    else:
        slot = args.slot

    if slot not in SLOTS:
        raise SystemExit("slot must be auto, blue, or green")

    if slot == active:
        raise SystemExit(f"Refusing to deploy over active slot: {slot}")

    tag_key = f"{slot.upper()}_TAG"
    state[tag_key] = args.tag
    env = compose_env(state)

    print(f"Deploying tag {args.tag} to {slot}")

    ensure_infra(env)

    if args.pull:
        run([*DOCKER_COMPOSE, "pull", f"backend-{slot}", f"frontend-{slot}"], env=env)
    else:
        print("Skipping image pull; using locally available images.")

    run(
        [
            *DOCKER_COMPOSE,
            "up",
            "-d",
            f"backend-{slot}",
            f"frontend-{slot}",
        ],
        env=env,
    )

    wait_for_healthy(f"backend-{slot}", env)
    wait_for_healthy(f"frontend-{slot}", env)

    smoke_test(slot, env)

    switch_upstream(slot, env)

    state[ACTIVE_SLOT] = slot
    write_env_file(state)

    print()
    print(f"Deploy complete: {slot} is active on {args.tag}")
    print(f"Old slot left running for rollback/drain: {other_slot(slot)}")
    print(
        f"Stop old slot with: {' '.join(DOCKER_COMPOSE)} "
        f"stop backend-{other_slot(slot)} frontend-{other_slot(slot)}"
    )
    print()
    print_status(state, env)


def cmd_ensure(args):
    state = read_env_file()
    active = state.get(ACTIVE_SLOT, "blue")
    if active not in SLOTS:
        raise SystemExit("Cannot ensure services: ACTIVE_SLOT is missing or invalid")

    env = compose_env(state)
    services = [
        *INFRA_SERVICES,
        f"backend-{active}",
        f"frontend-{active}",
    ]

    print(f"Ensuring shared services and active {active} slot are running.")
    ensure_services(services, env)

    wait_for_healthy("postgres", env)
    wait_for_healthy("nginx", env)
    wait_for_healthy("certbot", env)
    wait_for_healthy(f"backend-{active}", env)
    wait_for_healthy(f"frontend-{active}", env)

    print()
    print_status(state, env)


def cmd_rollback(args):
    state = read_env_file()
    active = state.get(ACTIVE_SLOT)
    if active not in SLOTS:
        raise SystemExit("Cannot rollback: ACTIVE_SLOT is missing or invalid")

    slot = other_slot(active)
    env = compose_env(state)

    print(f"Rolling back from {active} to {slot}")
    print("No images will be pulled; rollback uses the already-running previous slot.")
    print()

    ensure_infra(env)

    smoke_test(slot, env)
    switch_upstream(slot, env)

    state[ACTIVE_SLOT] = slot
    write_env_file(state)

    print()
    print(f"Rollback complete: {slot} is active")
    print()
    print_status(state, env)


def cmd_migrate(args):
    validate_tag(args.tag)

    slot = "blue"
    state = read_env_file()
    state[BLUE_TAG] = args.tag
    state[ACTIVE_SLOT] = "blue"
    env = compose_env(state)

    print("Maintenance migration deploy.")
    print("This will stop app containers, run migrations, and restart on blue.")
    print()

    run([*DOCKER_COMPOSE, "pull", "backend-blue", "frontend-blue"], env=env)

    ensure_infra(env)

    run(
        [
            *DOCKER_COMPOSE,
            "stop",
            "backend-blue",
            "frontend-blue",
            "backend-green",
            "frontend-green",
        ],
        env=env,
        check=False,
    )

    run(
        [
            *DOCKER_COMPOSE,
            "run",
            "--rm",
            "--no-deps",
            "--entrypoint",
            "uv",
            "backend-blue",
            "run",
            "manage.py",
            "migrate",
            "--noinput",
        ],
        env=env,
    )

    run([*DOCKER_COMPOSE, "up", "-d", "backend-blue", "frontend-blue"], env=env)

    wait_for_healthy("backend-blue", env)
    wait_for_healthy("frontend-blue", env)

    smoke_test(slot, env)

    switch_upstream(slot, env)

    write_env_file(state)

    print()
    print(f"Migration deploy complete: blue is active on {args.tag}")
    print()
    print_status(state, env)


def main():
    parser = argparse.ArgumentParser()
    sub = parser.add_subparsers(dest="command", required=True)

    status = sub.add_parser("status")
    status.set_defaults(func=cmd_status)

    ensure = sub.add_parser("ensure")
    ensure.set_defaults(func=cmd_ensure)

    rollback = sub.add_parser("rollback")
    rollback.set_defaults(func=cmd_rollback)

    deploy = sub.add_parser("deploy")
    deploy.add_argument(
        "--no-pull",
        dest="pull",
        action="store_false",
        help="Use locally available images instead of pulling the target slot images.",
    )
    deploy.set_defaults(pull=True)
    deploy.add_argument("tag")
    deploy.add_argument(
        "slot", choices=["auto", "blue", "green"], nargs="?", default="auto"
    )
    deploy.set_defaults(func=cmd_deploy)

    migrate = sub.add_parser("migrate")
    migrate.add_argument("tag")
    migrate.set_defaults(func=cmd_migrate)

    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
