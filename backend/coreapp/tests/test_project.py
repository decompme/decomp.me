import tempfile
from dataclasses import dataclass
from typing import Any, Optional
from unittest.mock import Mock, patch

import responses
from coreapp import compilers, platforms
from django.contrib.auth.models import User
from django.test.testcases import TestCase
from django.urls import reverse
from rest_framework import status

from coreapp.models.github import GitHubRepo, GitHubUser
from coreapp.models.profile import Profile
from coreapp.models.project import (
    Project,
    ProjectFunction,
    ProjectImportConfig,
    ProjectMember,
)
from coreapp.models.scratch import CompilerConfig
from coreapp.tests.common import BaseTestCase
from coreapp.tests.test_user import GITHUB_USER


@dataclass
class MockRepository:
    name: str
    default_branch: str = "master"
    content: str = (
        f"""header\nINCLUDE_ASM(void, "file", some_function, \ns32 arg0);\nfooter"""
    )

    def create_git_ref(self, **kwargs: Any) -> None:
        pass

    def get_contents(self, path: str) -> Mock:
        return Mock(
            decoded_content=Mock(decode=Mock(return_value=self.content)),
            sha="12345",
        )

    def update_file(self, content: str, **kwargs: Any) -> None:
        self.content = content

    def create_pull(self, **kwargs: Any) -> Mock:
        return Mock(html_url="http://github.com/fake_url")


@patch.object(
    GitHubRepo,
    "details",
    new=Mock(return_value=MockRepository("orig_repo")),
)
@patch.object(
    GitHubRepo,
    "get_sha",
    new=Mock(return_value="12345"),
)
@patch.object(
    Profile,
    "user",
    new=Mock(username="fakeuser", github=Mock(access_token="dummytoken")),
)
@patch("coreapp.views.project.Github.get_repo")
class ScratchPRTests(BaseTestCase):
    @responses.activate
    def setUp(self) -> None:
        super().setUp()
        project = ProjectTests.create_test_project()
        self.project = project
        compiler_config = CompilerConfig(
            platform="dummy",
            compiler="dummy",
            compiler_flags="",
        )
        compiler_config.save()
        self.compiler_config = compiler_config
        import_config = ProjectImportConfig(
            project=project,
            display_name="test",
            compiler_config=compiler_config,
            src_dir="src",
            nonmatchings_dir="asm/nonmatchings",
            nonmatchings_glob="**/*.s",
            symbol_addrs_path="symbol_addrs.txt",
        )
        import_config.save()
        self.import_config = import_config
        project_fn = ProjectFunction(
            project=project,
            rom_address="10",
            display_name="some_function",
            src_file="src/some_file.c",
            asm_file="asm/some_file.s",
            import_config=import_config,
        )
        project_fn.save()
        self.project_fn = project_fn
        scratch = self.create_nop_scratch()
        scratch.owner = Profile.objects.first()
        scratch.project_function = project_fn
        scratch.save()
        self.scratch = scratch

        # Login and create user
        responses.add(
            responses.POST,
            "https://github.com/login/oauth/access_token",
            json={
                "access_token": "__mock__",
                "scope": "public_repo",
            },
            status=200,
        )
        responses.add(
            responses.GET,
            "https://api.github.com:443/user",
            json=GITHUB_USER,
            status=200,
        )
        responses.add(
            responses.GET,
            f"https://api.github.com:443/user/{GITHUB_USER['id']}",
            json=GITHUB_USER,
            status=200,
        )
        response = self.client.post(
            reverse("current-user"),
            {
                "code": "__mock__",
            },
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Give user membership of project
        profile = Profile.objects.first()
        assert profile is not None
        assert profile.user is not None
        ProjectMember.objects.create(
            project=project,
            user=profile.user,
        )

    def test_pr_one_scratch(self, mock_get_repo: Mock) -> None:
        """
        Create a PR from one scratch to an upstream (project) repo
        """
        mock_fork = MockRepository("fork_repo")
        mock_get_repo.return_value = mock_fork

        response = self.client.post(
            reverse("project-pr", args=[self.project.slug]),
            data={"scratch_slugs": [self.scratch.slug]},
        )
        print(response.json())

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()["url"], "http://github.com/fake_url")
        self.assertEqual(
            mock_fork.content,
            f"""header\n{self.scratch.source_code}\nfooter""",
        )

    def test_pr_multiple_scratch(self, mock_get_repo: Mock) -> None:
        """
        Create a PR from two scratches to an upstream (project) repo
        """
        mock_fork = MockRepository("fork_repo")
        mock_get_repo.return_value = mock_fork

        scratch_2 = self.create_nop_scratch()
        scratch_2.owner = Profile.objects.first()
        scratch_2.project_function = self.project_fn
        scratch_2.save()

        response = self.client.post(
            reverse("project-pr", args=[self.project.slug]),
            data={"scratch_slugs": [self.scratch.slug, scratch_2.slug]},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()["url"], "http://github.com/fake_url")
        self.assertEqual(
            mock_fork.content,
            f"""header\n{self.scratch.source_code}\nfooter""",
        )


class ProjectTests(TestCase):
    @staticmethod
    def create_test_project(slug: str = "test") -> Project:
        repo = GitHubRepo(
            owner="decompme",
            repo="example-project",
            branch="not_a_real_branch",
        )
        repo.save()

        project = Project(
            slug=slug,
            repo=repo,
        )
        project.save()

        return project

    def fake_clone_test_repo(self, repo: GitHubRepo) -> None:
        with patch("coreapp.models.github.subprocess.run"):
            repo.pull()

    @patch("coreapp.models.github.subprocess.run")
    @patch("pathlib.Path.mkdir")
    @patch("pathlib.Path.exists")
    def test_create_repo_dir(
        self, mock_exists: Mock, mock_mkdir: Mock, mock_subprocess: Mock
    ) -> None:
        """
        Test that the repo is cloned into a directory
        """
        mock_exists.return_value = False
        project = ProjectTests.create_test_project()
        project.repo.pull()

        mock_subprocess.assert_called_once()
        self.assertListEqual(
            mock_subprocess.call_args.args[0][:3],
            ["git", "clone", "https://github.com/decompme/example-project"],
        )
        mock_mkdir.assert_called_once_with(parents=True)

    @patch("coreapp.models.github.GitHubRepo.pull")
    @patch.object(
        GitHubRepo,
        "details",
        new=Mock(return_value=MockRepository("orig_repo")),
    )
    @patch.object(
        GitHubUser,
        "details",
        new=Mock(return_value=None),
    )
    def test_create_api_json(self, mock_pull: Mock) -> None:
        """
        Test that you can create a project via the JSON API, and that it only works when is_staff=True
        """

        # Make a request so we can get a profile
        response = self.client.get(reverse("project-list"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        profile = Profile.objects.first()
        assert profile is not None

        # Give the profile a User and GitHubUser
        profile.user = User(username="test")
        profile.user.save()
        profile.save()
        GitHubUser.objects.create(
            user=profile.user, github_id=1234, access_token="__mock__"
        )

        data = {
            "slug": "example-project",
            "repo": {
                "owner": "decompme",
                "repo": "example-project",
                "branch": "not_a_real_branch",
            },
        }

        # Fail when not admin
        response = self.client.post(
            reverse("project-list"),
            data,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # Succeed when admin
        profile.user.is_staff = True
        profile.user.save()
        response = self.client.post(
            reverse("project-list"),
            data,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        mock_pull.assert_called_once()
        self.assertEqual(Project.objects.count(), 1)

    @patch("coreapp.models.github.GitHubRepo.get_dir")
    @patch("coreapp.models.github.shutil.rmtree")
    def test_delete_repo_dir(self, mock_rmtree: Mock, mock_get_dir: Mock) -> None:
        """
        Test that the repo's directory is deleted when the repo is
        """
        project = ProjectTests.create_test_project()
        mock_dir = Mock(exists=lambda: True)
        mock_get_dir.return_value = mock_dir
        project.delete()
        project.repo.delete()
        mock_rmtree.assert_called_once_with(mock_dir)

    def test_import_function(self) -> None:
        with tempfile.TemporaryDirectory() as local_files_dir:
            with self.settings(LOCAL_FILE_DIR=local_files_dir):
                project = ProjectTests.create_test_project()

                # add some asm
                dir = project.repo.get_dir(check_exists=False)
                (dir / "asm" / "nonmatchings" / "section").mkdir(parents=True)
                (dir / "src").mkdir(parents=True)
                asm_file = dir / "asm" / "nonmatchings" / "section" / "test.s"
                with asm_file.open("w") as f:
                    f.writelines(
                        [
                            "glabel test\n",
                            "jr $ra\n",
                            "nop\n",
                        ]
                    )
                with (dir / "src" / "section.c").open("w") as f:
                    f.writelines(
                        [
                            "typedef int s32;\n",
                        ]
                    )
                with (dir / "symbol_addrs.txt").open("w") as f:
                    f.writelines(
                        [
                            "test = 0x80240000; // type:func rom:0x1000\n",
                        ]
                    )

                # configure the import
                compiler_config = CompilerConfig(
                    platform=platforms.DUMMY.id,
                    compiler=compilers.DUMMY.id,
                    compiler_flags="",
                )
                compiler_config.save()
                import_config = ProjectImportConfig(
                    project=project,
                    display_name="test",
                    compiler_config=compiler_config,
                    src_dir="src",
                    nonmatchings_dir="asm/nonmatchings",
                    nonmatchings_glob="**/*.s",
                    symbol_addrs_path="symbol_addrs.txt",
                )
                import_config.save()

                # import the function
                self.assertEqual(ProjectFunction.objects.count(), 0)
                project.import_functions()
                self.assertEqual(ProjectFunction.objects.count(), 1)

                pf = ProjectFunction.objects.first()

                assert pf is not None
                self.assertFalse(pf.is_matched_in_repo)

                # create a scratch from the function
                fn: Optional[ProjectFunction] = ProjectFunction.objects.first()
                assert fn is not None

                scratch = fn.create_scratch()
                self.assertEqual(scratch.platform, compiler_config.platform)
                self.assertEqual(scratch.compiler, compiler_config.compiler)
                self.assertEqual(scratch.compiler_flags, compiler_config.compiler_flags)
                self.assertEqual(scratch.project_function, fn)

                # match the function (by deleting the asm) and verify it is marked as matching
                asm_file.unlink()
                project.import_functions()
                self.assertEqual(ProjectFunction.objects.count(), 1)

                pf = ProjectFunction.objects.first()
                assert pf is not None

                self.assertTrue(pf.is_matched_in_repo)

    def test_put_project_permissions(self) -> None:
        with tempfile.TemporaryDirectory() as local_files_dir:
            with self.settings(LOCAL_FILE_DIR=local_files_dir):
                project = ProjectTests.create_test_project()

                # try, and fail
                response = self.client.patch(
                    reverse("project-detail", args=[project.slug]),
                    {
                        "description": "new description",
                    },
                    content_type="application/json",
                )
                self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

                p = Project.objects.first()
                assert p is not None
                self.assertNotEqual(p.description, "new description")

                # add project member
                profile = Profile.objects.first()
                assert profile is not None
                profile.user = User(username="test")
                profile.user.save()
                profile.save()
                ProjectMember(project=project, user=profile.user).save()

                # try again
                response = self.client.patch(
                    reverse("project-detail", args=[project.slug]),
                    {
                        "description": "new description",
                    },
                    content_type="application/json",
                )
                self.assertEqual(response.status_code, status.HTTP_200_OK)

                p = Project.objects.first()
                assert p is not None
                self.assertEqual(p.description, "new description")
