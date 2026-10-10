from dataclasses import replace
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest import TestCase
from unittest.mock import Mock, patch

from cromper.compilers import IDOCompiler
from cromper.config import CromperConfig
from cromper.libraries import LibraryVersions
from cromper.metadata import metadata_revision
from cromper.platforms import N64


class MetadataRevisionTests(TestCase):
    def make_config(self, library_path: Path) -> CromperConfig:
        config = CromperConfig()
        config.library_base_path = library_path
        # Metadata tests do not require installed compiler binaries.
        config.compilers_instance = Mock()
        config.compilers_instance.available_compilers.return_value = [
            IDOCompiler(id="test", cc="cc", platform=N64, library_include_flag="-I")
        ]
        return config

    def test_revision_is_stable_across_instances_and_paths(self):
        with TemporaryDirectory() as first, TemporaryDirectory() as second:
            config = self.make_config(Path(first))
            original = metadata_revision(config)
            self.assertEqual(metadata_revision(config), original)
            self.assertEqual(
                metadata_revision(self.make_config(Path(second))), original
            )

    def test_revision_tracks_compiler_platform_and_library_changes(self):
        with TemporaryDirectory() as directory:
            config = self.make_config(Path(directory))
            original = metadata_revision(config)
            include = Path(directory) / "n64" / "libultra" / "1" / "include"
            include.mkdir(parents=True)
            libraries_changed = metadata_revision(config)
            self.assertNotEqual(libraries_changed, original)
            with patch.object(
                config.compilers_instance, "available_compilers", return_value=[]
            ):
                self.assertNotEqual(metadata_revision(config), libraries_changed)
            with patch.object(
                config.platforms_instance,
                "all_platforms",
                return_value={N64.id: replace(N64, name="Changed platform name")},
            ):
                self.assertNotEqual(metadata_revision(config), libraries_changed)

    def test_enumeration_order_does_not_change_revision(self):
        with TemporaryDirectory() as directory:
            config = self.make_config(Path(directory))
            compiler = config.compilers_instance.available_compilers()[0]
            compilers = [compiler, replace(compiler, id="another")]
            config.compilers_instance.available_compilers.return_value = compilers
            libraries = [
                LibraryVersions("a", ["1"], "n64"),
                LibraryVersions("b", ["2"], "ps1"),
            ]
            with patch(
                "cromper.metadata.libraries.available_libraries", return_value=libraries
            ) as available:
                first = metadata_revision(config)
                available.return_value = list(reversed(libraries))
                config.compilers_instance.available_compilers.return_value = list(
                    reversed(compilers)
                )
                self.assertEqual(metadata_revision(config), first)
