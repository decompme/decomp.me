import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import deploy


class DeployTests(unittest.TestCase):
    def test_deploy_commands_default_to_latest(self):
        commands = [
            (["deploy.py", "deploy"], "cmd_deploy"),
            (["deploy.py", "deploy-cromper"], "cmd_deploy_cromper"),
            (["deploy.py", "migrate"], "cmd_migrate"),
        ]

        for argv, handler in commands:
            with self.subTest(command=argv[1]):
                with (
                    patch.object(sys, "argv", argv),
                    patch.object(deploy, handler) as command,
                ):
                    deploy.main()

                self.assertEqual(command.call_args.args[0].tag, "latest")

    def test_compose_env_defaults_all_image_tags(self):
        with patch.dict("os.environ", {}, clear=True):
            env = deploy.compose_env({})

        self.assertEqual(env["BLUE_TAG"], "latest")
        self.assertEqual(env["GREEN_TAG"], "latest")
        self.assertEqual(env["NGINX_TAG"], "latest")
        self.assertEqual(env["CROMPER_ORANGE_TAG"], "latest")
        self.assertEqual(env["CROMPER_PURPLE_TAG"], "latest")

    def test_read_env_file_migrates_legacy_cromper_tag(self):
        with tempfile.TemporaryDirectory() as directory:
            env_file = Path(directory) / ".deploy.env"
            env_file.write_text("CROMPER_TAG=legacy-tag\n")
            with patch.object(deploy, "DEPLOY_ENV", env_file):
                state = deploy.read_env_file()

        self.assertEqual(state["CROMPER_ORANGE_TAG"], "legacy-tag")
        self.assertNotIn("CROMPER_TAG", state)

    def test_write_cromper_upstream_selects_slot(self):
        with tempfile.TemporaryDirectory() as directory:
            config = Path(directory) / "cromper-upstream.conf"
            with patch.object(deploy, "CROMPER_UPSTREAM_CONF", config):
                deploy.write_cromper_upstream("purple")

            self.assertIn("server cromper-purple:8888;", config.read_text())

    def test_switch_cromper_upstream_reloads_proxy(self):
        with tempfile.TemporaryDirectory() as directory:
            config = Path(directory) / "cromper-upstream.conf"
            config.write_text("previous upstream")
            with (
                patch.object(deploy, "CROMPER_UPSTREAM_CONF", config),
                patch.object(deploy, "nginx_test_and_reload") as reload_nginx,
            ):
                deploy.switch_cromper_upstream("purple", {})

            reload_nginx.assert_called_once_with({}, "cromper-proxy")
            self.assertIn("server cromper-purple:8888;", config.read_text())


if __name__ == "__main__":
    unittest.main()
