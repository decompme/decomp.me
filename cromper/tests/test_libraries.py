from pathlib import Path

from cromper.libraries import (
    Library,
    LibraryVersions,
    available_libraries,
    libraries_for_platform,
)

from .common import CromperTestCase


class LibraryTests(CromperTestCase):
    def setUp(self) -> None:
        super().setUp()
        self.config.library_base_path = self.test_dir / "libraries"

    def add_library(self, platform: str, name: str, version: str) -> Path:
        include_path = (
            self.config.library_base_path / platform / name / version / "include"
        )
        include_path.mkdir(parents=True)
        return include_path

    def test_library_paths_use_config(self) -> None:
        library = Library(name="libultra", version="2.0L")
        versions = LibraryVersions(
            name="libultra", supported_versions=["2.0L"], platform="n64"
        )

        expected_path = self.config.library_base_path / "n64" / "libultra"
        self.assertEqual(versions.get_path(self.config), expected_path)
        self.assertEqual(
            library.get_include_path("n64", self.config),
            expected_path / "2.0L" / "include",
        )

    def test_available_libraries_use_config(self) -> None:
        self.add_library("n64", "libultra", "2.0L")
        self.add_library("n64", "libultra", "2.0I")
        self.add_library("gba", "agb", "1.0")

        self.assertEqual(
            sorted(
                available_libraries(self.config),
                key=lambda library: (library.platform, library.name),
            ),
            [
                LibraryVersions(name="agb", supported_versions=["1.0"], platform="gba"),
                LibraryVersions(
                    name="libultra",
                    supported_versions=["2.0I", "2.0L"],
                    platform="n64",
                ),
            ],
        )
        self.assertEqual(
            libraries_for_platform("n64", self.config),
            [
                LibraryVersions(
                    name="libultra",
                    supported_versions=["2.0I", "2.0L"],
                    platform="n64",
                )
            ],
        )
