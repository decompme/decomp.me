import datetime

from django.contrib.auth.models import User
from django.test import TestCase

from coreapp.housekeeping import (
    remove_anonymous_profiles,
    remove_orphan_asms,
    remove_orphan_assemblies,
    remove_orphan_contexts,
    remove_ownerless_scratches,
    remove_unchanged_anonymous_forks,
    remove_unchanged_same_author_forks,
)
from coreapp.models.profile import Profile
from coreapp.models.scratch import Asm, Assembly, Context, Scratch


class HousekeepingTests(TestCase):
    def setUp(self) -> None:
        self.cutoff_datetime = datetime.datetime.now(datetime.UTC) - datetime.timedelta(
            days=1
        )
        asm = Asm.objects.create(hash="target-asm", data="jr $ra\nnop")
        self.assembly = Assembly.objects.create(
            hash="target-assembly",
            arch="mips",
            source_asm=asm,
        )
        context = Context.get_or_create_from_text("int x;")
        assert context is not None
        self.context = context
        self.foo = self.create_profile("foo")
        self.bar = self.create_profile("bar")

    def create_assembly(self, key: str, asm: Asm | None = None) -> Assembly:
        source_asm = asm or Asm.objects.create(hash=f"{key}-asm", data="jr $ra\nnop")
        return Assembly.objects.create(
            hash=f"{key}-assembly",
            arch="mips",
            source_asm=source_asm,
        )

    def create_profile(self, username: str) -> Profile:
        user = User.objects.create_user(username=username)
        return Profile.objects.create(user=user)

    def create_scratch(
        self,
        *,
        owner: Profile | None,
        parent: Scratch | None = None,
        source_code: str = "int func(void) { return 0; }",
        context: Context | None = None,
        compiler: str = "dummy",
        compiler_flags: str = "-O2",
        diff_flags: list[str] | None = None,
    ) -> Scratch:
        return Scratch.objects.create(
            owner=owner,
            parent=parent,
            target_assembly=self.assembly,
            source_code=source_code,
            context_fk=context if context is not None else self.context,
            compiler=compiler,
            compiler_flags=compiler_flags,
            diff_flags=diff_flags if diff_flags is not None else ["-m"],
            platform="dummy",
        )

    def make_old(self, *scratches: Scratch) -> None:
        Scratch.objects.filter(pk__in=[scratch.pk for scratch in scratches]).update(
            last_updated=self.cutoff_datetime - datetime.timedelta(seconds=1)
        )

    def test_removes_ownerless_scratches_created_before_cutoff(self) -> None:
        old_ownerless_scratch = self.create_scratch(owner=None)
        old_owned_scratch = self.create_scratch(owner=self.foo)
        new_ownerless_scratch = self.create_scratch(owner=None)
        Scratch.objects.filter(
            pk__in=[old_ownerless_scratch.pk, old_owned_scratch.pk]
        ).update(creation_time=self.cutoff_datetime - datetime.timedelta(seconds=1))

        deleted = remove_ownerless_scratches(self.cutoff_datetime)

        self.assertEqual(deleted, 1)
        self.assertFalse(Scratch.objects.filter(pk=old_ownerless_scratch.pk).exists())
        self.assertTrue(Scratch.objects.filter(pk=old_owned_scratch.pk).exists())
        self.assertTrue(Scratch.objects.filter(pk=new_ownerless_scratch.pk).exists())

    def test_dry_run_counts_ownerless_scratches_without_deleting(self) -> None:
        old_ownerless_scratch = self.create_scratch(owner=None)
        Scratch.objects.filter(pk=old_ownerless_scratch.pk).update(
            creation_time=self.cutoff_datetime - datetime.timedelta(seconds=1)
        )

        deleted = remove_ownerless_scratches(self.cutoff_datetime, dry_run=True)

        self.assertEqual(deleted, 1)
        self.assertTrue(Scratch.objects.filter(pk=old_ownerless_scratch.pk).exists())

    def test_removes_scratchless_anonymous_profiles_created_before_cutoff(self) -> None:
        old_scratchless_profile = Profile.objects.create(user=None)
        old_profile_with_scratch = Profile.objects.create(user=None)
        new_scratchless_profile = Profile.objects.create(user=None)
        self.create_scratch(owner=old_profile_with_scratch)
        Profile.objects.filter(
            pk__in=[old_scratchless_profile.pk, old_profile_with_scratch.pk]
        ).update(creation_date=self.cutoff_datetime - datetime.timedelta(seconds=1))

        deleted = remove_anonymous_profiles(self.cutoff_datetime)

        self.assertEqual(deleted, 1)
        self.assertFalse(Profile.objects.filter(pk=old_scratchless_profile.pk).exists())
        self.assertTrue(Profile.objects.filter(pk=old_profile_with_scratch.pk).exists())
        self.assertTrue(Profile.objects.filter(pk=new_scratchless_profile.pk).exists())
        self.assertTrue(Profile.objects.filter(pk=self.foo.pk).exists())

    def test_removes_orphan_contexts(self) -> None:
        orphan_context = Context.get_or_create_from_text("orphan context")
        used_context = Context.get_or_create_from_text("used context")
        assert orphan_context is not None
        assert used_context is not None
        self.create_scratch(owner=self.foo, context=used_context)

        deleted = remove_orphan_contexts(self.cutoff_datetime)

        self.assertEqual(deleted, 2)
        self.assertFalse(Context.objects.filter(pk=orphan_context.pk).exists())
        self.assertFalse(Context.objects.filter(pk=self.context.pk).exists())
        self.assertTrue(Context.objects.filter(pk=used_context.pk).exists())

    def test_removes_orphan_assemblies(self) -> None:
        orphan_assembly = self.create_assembly("orphan")
        live_assembly = self.create_assembly("live")
        self.create_scratch(owner=self.foo).target_assembly = live_assembly
        Scratch.objects.filter(owner=self.foo).update(target_assembly=live_assembly)

        deleted = remove_orphan_assemblies(self.cutoff_datetime)

        self.assertEqual(deleted, 2)
        self.assertFalse(Assembly.objects.filter(pk=orphan_assembly.pk).exists())
        self.assertFalse(Assembly.objects.filter(pk=self.assembly.pk).exists())
        self.assertTrue(Assembly.objects.filter(pk=live_assembly.pk).exists())

    def test_removes_orphan_asms(self) -> None:
        orphan_asm = Asm.objects.create(hash="orphan-asm", data="jr $ra\nnop")
        used_asm = Asm.objects.create(hash="used-asm", data="jr $ra\nnop")
        self.create_assembly("used", asm=used_asm)

        deleted = remove_orphan_asms(self.cutoff_datetime)

        self.assertEqual(deleted, 1)
        self.assertFalse(Asm.objects.filter(pk=orphan_asm.pk).exists())
        self.assertTrue(Asm.objects.filter(pk=used_asm.pk).exists())

    def test_orphan_asm_cleanup_follows_orphan_assembly_cleanup(self) -> None:
        orphan_assembly = self.create_assembly("orphan")
        source_asm = orphan_assembly.source_asm
        assert source_asm is not None

        deleted_asms_before_assemblies = remove_orphan_asms(self.cutoff_datetime)
        deleted_assemblies = remove_orphan_assemblies(self.cutoff_datetime)
        deleted_asms_after_assemblies = remove_orphan_asms(self.cutoff_datetime)

        self.assertEqual(deleted_asms_before_assemblies, 0)
        self.assertEqual(deleted_assemblies, 2)
        self.assertEqual(deleted_asms_after_assemblies, 2)
        self.assertFalse(Assembly.objects.filter(pk=orphan_assembly.pk).exists())
        self.assertFalse(Asm.objects.filter(pk=source_asm.pk).exists())

    def test_removes_unchanged_same_author_fork(self) -> None:
        root = self.create_scratch(owner=self.foo)
        fork = self.create_scratch(owner=self.bar, parent=root)
        unchanged_same_author_fork = self.create_scratch(owner=self.bar, parent=fork)
        self.make_old(root, fork, unchanged_same_author_fork)

        deleted = remove_unchanged_same_author_forks(self.cutoff_datetime)

        self.assertEqual(deleted, 1)
        self.assertTrue(Scratch.objects.filter(pk=root.pk).exists())
        self.assertTrue(Scratch.objects.filter(pk=fork.pk).exists())
        self.assertFalse(
            Scratch.objects.filter(pk=unchanged_same_author_fork.pk).exists()
        )

    def test_keeps_unchanged_fork_with_different_author(self) -> None:
        root = self.create_scratch(owner=self.foo)
        fork = self.create_scratch(owner=self.bar, parent=root)
        self.make_old(root, fork)

        deleted = remove_unchanged_same_author_forks(self.cutoff_datetime)

        self.assertEqual(deleted, 0)
        self.assertTrue(Scratch.objects.filter(pk=fork.pk).exists())

    def test_keeps_same_author_fork_with_changes(self) -> None:
        root = self.create_scratch(owner=self.foo)
        fork = self.create_scratch(
            owner=self.foo,
            parent=root,
            compiler_flags="-O2 -funroll-loops",
        )
        self.make_old(root, fork)

        deleted = remove_unchanged_same_author_forks(self.cutoff_datetime)

        self.assertEqual(deleted, 0)
        self.assertTrue(Scratch.objects.filter(pk=fork.pk).exists())

    def test_keeps_unchanged_same_author_fork_with_children(self) -> None:
        root = self.create_scratch(owner=self.foo)
        fork = self.create_scratch(owner=self.foo, parent=root)
        child = self.create_scratch(
            owner=self.foo,
            parent=fork,
            source_code="int func(void) { return 1; }",
        )
        self.make_old(root, fork, child)

        deleted = remove_unchanged_same_author_forks(self.cutoff_datetime)

        self.assertEqual(deleted, 0)
        self.assertTrue(Scratch.objects.filter(pk=fork.pk).exists())
        self.assertTrue(Scratch.objects.filter(pk=child.pk).exists())

    def test_existing_anonymous_fork_cleanup_still_removes_unchanged_forks(
        self,
    ) -> None:
        root = self.create_scratch(owner=self.foo)
        fork = self.create_scratch(owner=None, parent=root)
        self.make_old(root, fork)

        deleted = remove_unchanged_anonymous_forks(self.cutoff_datetime)

        self.assertEqual(deleted, 1)
        self.assertFalse(Scratch.objects.filter(pk=fork.pk).exists())

    def test_keeps_unchanged_anonymous_fork_with_children(self) -> None:
        root = self.create_scratch(owner=self.foo)
        fork = self.create_scratch(owner=None, parent=root)
        child = self.create_scratch(
            owner=None,
            parent=fork,
            source_code="int func(void) { return 1; }",
        )
        self.make_old(root, fork, child)

        deleted = remove_unchanged_anonymous_forks(self.cutoff_datetime)

        self.assertEqual(deleted, 0)
        self.assertTrue(Scratch.objects.filter(pk=fork.pk).exists())
        self.assertTrue(Scratch.objects.filter(pk=child.pk).exists())
