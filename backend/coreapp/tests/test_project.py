import tempfile

from coreapp.models.github import GitHubUser
from coreapp.models.profile import Profile
from coreapp.models.project import Project, ProjectMember
from coreapp.tests.common import BaseTestCase
from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework import status


class ProjectTests(BaseTestCase):
    @staticmethod
    def create_test_project(slug: str = "test") -> Project:
        project = Project(
            slug=slug,
        )
        project.save()

        return project

    def test_create_api_json(self) -> None:
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
        GitHubUser.objects.create(user=profile.user, github_id=1234)

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
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # Succeed when admin
        profile.user.is_staff = True
        profile.user.save()
        response = self.client.post(
            reverse("project-list"),
            data,
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Project.objects.count(), 1)

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
                    format="json",
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
                    format="json",
                )
                self.assertEqual(response.status_code, status.HTTP_200_OK)

                p = Project.objects.first()
                assert p is not None
                self.assertEqual(p.description, "new description")
