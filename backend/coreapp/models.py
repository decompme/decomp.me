from django.utils.crypto import get_random_string
from django.db import models, transaction
from django.contrib.auth.models import User
from django.core.validators import RegexValidator
from django.utils.translation import gettext_lazy as _

from typing import Any, Dict, Optional, List, Tuple
from pathlib import Path
from glob import glob
import logging
import shlex

from .symbol_addrs import Symbol, parse_symbol_addrs, symbol_name_from_asm_file
from .context import c_file_to_context
from decompme.settings import FRONTEND_BASE

logger = logging.getLogger(__name__)

def gen_scratch_id() -> str:
    ret = get_random_string(length=5)

    if Scratch.objects.filter(slug=ret).exists():
        return gen_scratch_id()

    return ret

class Profile(models.Model):
    creation_date = models.DateTimeField(auto_now_add=True)
    last_request_date = models.DateTimeField(auto_now_add=True)
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="profile",
        null=True,
    )

    def is_anonymous(self) -> bool:
        return self.user is None

    def __str__(self):
        if self.user:
            return self.user.username
        else:
            return str(self.id)

    def get_html_url(self) -> Optional[str]:
        if self.user:
            return f"{FRONTEND_BASE}/u/{self.user.username}"
        else:
            # No URLs for anonymous profiles
            return None

class Asm(models.Model):
    hash = models.CharField(max_length=64, primary_key=True)
    data = models.TextField()

    def __str__(self):
        return self.data if len(self.data) < 20 else self.data[:17] + "..."

class Assembly(models.Model):
    hash = models.CharField(max_length=64, primary_key=True)
    time = models.DateTimeField(auto_now_add=True)
    arch = models.CharField(max_length=100)
    source_asm = models.ForeignKey(Asm, on_delete=models.CASCADE)
    elf_object = models.BinaryField(blank=True)

class CompilerConfig(models.Model):
    # TODO: validate compiler and platform
    compiler = models.CharField(max_length=100)
    platform = models.CharField(max_length=100)
    compiler_flags = models.TextField(max_length=1000, default="", blank=True)

class Project(models.Model):
    slug = models.SlugField(primary_key=True)
    creation_time = models.DateTimeField(auto_now_add=True)
    repo = models.OneToOneField("GithubRepo", on_delete=models.PROTECT)
    icon_url = models.URLField(blank=False)

    def __str__(self):
        return self.slug

    def get_html_url(self) -> str:
        return f"{FRONTEND_BASE}/{self.slug}"

    @transaction.atomic
    def import_functions(self) -> None:
        # Mark all ProjectFunctions for this project as matched.
        # If no ProjectImportConfigs find them (where they will be marked as unmatched), they are considered matched.
        ProjectFunction.objects.filter(project=self).update(is_matched_in_repo=True)

        # Execute all ProjectImportConfigs
        for obj in ProjectImportConfig.objects.filter(project=self):
            import_config: ProjectImportConfig = obj
            import_config.execute_import()

    def is_member(self, profile: Profile) -> bool:
        return ProjectMember.objects.filter(project=self, profile=profile).exists()

    def members(self) -> List["ProjectMember"]:
        return [m for m in ProjectMember.objects.filter(project=self)]

class Scratch(models.Model):
    slug = models.SlugField(primary_key=True, default=gen_scratch_id)
    name = models.CharField(max_length=512, default="Untitled", blank=False)
    description = models.TextField(max_length=5000, default="", blank=True)
    creation_time = models.DateTimeField(auto_now_add=True)
    last_updated = models.DateTimeField(auto_now=True)
    compiler = models.CharField(max_length=100) # TODO: reference a CompilerConfig
    platform = models.CharField(max_length=100, blank=True) # TODO: reference a CompilerConfig
    compiler_flags = models.TextField(max_length=1000, default="", blank=True) # TODO: reference a CompilerConfig
    target_assembly = models.ForeignKey(Assembly, on_delete=models.CASCADE)
    source_code = models.TextField(blank=True)
    context = models.TextField(blank=True)
    diff_label = models.CharField(max_length=512, blank=True, null=True)
    score = models.IntegerField(default=-1)
    max_score = models.IntegerField(default=-1)
    parent = models.ForeignKey("self", null=True, blank=True, on_delete=models.SET_NULL)
    owner = models.ForeignKey(Profile, null=True, blank=True, on_delete=models.SET_NULL)
    project_function = models.ForeignKey("ProjectFunction", null=True, blank=True, on_delete=models.SET_NULL) # The function, if any, that this scratch is an attempt of

    class Meta:
        ordering = ['-creation_time']
        verbose_name_plural = "Scratches"

    def __str__(self):
        return self.slug

    # hash for etagging
    def __hash__(self):
        return hash((self.slug, self.last_updated))

    def get_html_url(self) -> str:
        return FRONTEND_BASE + "/scratch/" + self.slug

    def is_claimable(self) -> bool:
        return self.owner is None

class ProjectImportConfig(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE)

    display_name = models.CharField(max_length=512, default="", blank=True)
    compiler_config = models.ForeignKey(CompilerConfig, on_delete=models.PROTECT)
    src_dir = models.CharField(max_length=100, default="src")
    nonmatchings_dir = models.CharField(max_length=100, default="asm/nonmatchings")
    nonmatchings_glob = models.CharField(max_length=100, default="**/*.s")
    symbol_addrs_path = models.CharField(max_length=100, default="symbol_addrs.txt")

    def __str__(self):
        return f"{self.display_name or self.id} ({self.project})"

    def get_paths(self) -> Tuple[Path, Path, Path]:
        repo_dir: Path = self.project.repo.get_dir()

        src_dir = repo_dir.joinpath(self.src_dir)
        nonmatchings_dir = repo_dir.joinpath(self.nonmatchings_dir)
        symbol_addrs_path = repo_dir.joinpath(self.symbol_addrs_path)

        assert src_dir.is_dir()
        assert nonmatchings_dir.is_dir()
        assert symbol_addrs_path.is_file()

        return src_dir, nonmatchings_dir, symbol_addrs_path

    @transaction.atomic
    def execute_import(self) -> None:
        project_dir: Path = self.project.repo.get_dir()
        src_dir, nonmatchings_dir, symbol_addrs_path = self.get_paths()

        symbol_addrs = parse_symbol_addrs(symbol_addrs_path)
        asm_files = [Path(p) for p in glob(str(nonmatchings_dir.joinpath(self.nonmatchings_glob)), recursive=True)]

        logger.info("Importing %d nonmatching asm files from %s", len(asm_files), nonmatchings_dir)

        for asm_file in asm_files:
            symbol_name = symbol_name_from_asm_file(asm_file)
            if not symbol_name:
                logger.warn(f"unable to determine symbol name of function '{asm_file}'")
                continue

            symbol = symbol_addrs.get(symbol_name)
            if not symbol:
                logger.warn(f"no symbol with name '{symbol_name}' found")
                continue
            if not symbol.rom_address:
                logger.warn(f"symbol '{symbol_name}' requires a ROM address")
                continue

            # Search C file for this function (TODO: use configurable regex replace?)
            src_file = src_dir / asm_file.relative_to(nonmatchings_dir).parent.with_suffix(".c")
            if not src_file.is_file():
                logger.warn(f"no C file found for '{asm_file}' (looked for '{src_file}')")
                continue

            # Create or update ProjectFunction
            func: Optional[ProjectFunction] = ProjectFunction.objects.filter(project=self.project, rom_address=symbol.rom_address).first()
            if func is not None:
                func.display_name = symbol.label
                func.is_matched_in_repo = False
                func.src_file = str(src_file.relative_to(project_dir))
                func.asm_file = str(asm_file.relative_to(project_dir))
                func.import_config = self
            else:
                func = ProjectFunction(
                    project=self.project,
                    rom_address=symbol.rom_address,

                    display_name=symbol.label,
                    is_matched_in_repo=False,
                    src_file=str(src_file.relative_to(project_dir)),
                    asm_file=str(asm_file.relative_to(project_dir)),
                    import_config=self,
                )
            func.save()

class ProjectFunction(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE) # note: redundant w.r.t. import_config.project
    rom_address = models.IntegerField()

    creation_time = models.DateTimeField(auto_now_add=True)

    display_name = models.CharField(max_length=128, blank=False)
    is_matched_in_repo = models.BooleanField(default=False)
    #complexity = models.IntegerField()

    src_file = models.CharField(max_length=256)
    asm_file = models.CharField(max_length=256)
    import_config = models.ForeignKey(ProjectImportConfig, on_delete=models.CASCADE)

    class Meta:
        constraints = [
            # ProjectFunctions are identified uniquely by (project, rom_address)
            models.UniqueConstraint(fields=["project", "rom_address"], name="unique_project_function_addr"),
        ]

    def get_html_url(self) -> str:
        return f"{self.project.get_html_url()}/{self.rom_address:X}"

    def __str__(self):
        return f"{self.display_name} ({self.project})"

    def create_scratch(self) -> Scratch:
        from .views.scratch import create_scratch

        import_config: ProjectImportConfig = self.import_config
        project: Project = import_config.project
        compiler_config: CompilerConfig = import_config.compiler_config

        project_dir: Path = project.repo.get_dir()
        src_file = project_dir / Path(self.src_file)
        asm_file = project_dir / Path(self.asm_file)

        source_code = "" # TODO: grab sourcecode from src_file's NON_MATCHING block, if any

        # TODO: make this more configurable or something
        cpp_flags = shlex.split(compiler_config.compiler_flags) + [
            "-Iinclude",
            "-Isrc",
            "-Iver/current/build/include",
            "-D_LANGUAGE_C",
            "-DF3DEX_GBI_2",
            "-D_MIPS_SZLONG=32",
            "-DSCRIPT(...)={}" # only relevant for papermario. bad
            "-D__attribute__(...)=",
            "-D__asm__(...)=",
            "-ffreestanding",
            "-DM2CTX",
            "-DPERMUTER",
        ]

        # Attempt to generate context (TODO: use a real context filesystem that is #included so we don't have to do this)
        try:
            context = c_file_to_context(str(project_dir), str(src_file), cpp_flags=cpp_flags)
        except Exception as e:
            logging.error(f"failed to generate context for {asm_file}: {e}")
            context = f"/* context generation failed: {e} */"

        with asm_file.open("r") as f:
            target_asm = f.read()

        return create_scratch({
            "project": self.project.slug,
            "rom_address": self.rom_address,
            "diff_label": symbol_name_from_asm_file(asm_file),
            "target_asm": target_asm,
            "source_code": source_code,
            "context": context,
            "platform": compiler_config.platform,
            "compiler": compiler_config.compiler,
            "compiler_flags": compiler_config.compiler_flags,
        }, allow_project=True)

class ProjectMember(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE)
    profile = models.ForeignKey(Profile, on_delete=models.CASCADE)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["project", "profile"], name="unique_project_member"),
        ]

    def __str__(self):
        return f"{self.profile} is a member of {self.project}"
