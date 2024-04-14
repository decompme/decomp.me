import copy
from dataclasses import dataclass, field
from typing import Any, Dict

from coreapp.models.preset import Preset
from coreapp.models.scratch import Scratch
from coreapp.flags import COMMON_DIFF_FLAGS, Flags, Flag


@dataclass(frozen=True)
class Platform:
    id: str
    name: str
    description: str
    arch: str
    diff_flags: Flags = field(default_factory=lambda: COMMON_DIFF_FLAGS, hash=False)
    has_decompiler: bool = False

    def get_num_scratches(self) -> int:
        return Scratch.objects.filter(platform=self.id).count()

    def to_json(
        self, include_presets: bool = True, include_num_scratches: bool = False
    ) -> Dict[str, Any]:
        ret: Dict[str, Any] = {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "arch": self.arch,
            "has_decompiler": self.has_decompiler,
        }
        if include_presets:
            # FIXME: circular dependency if imported at top level
            from coreapp.serializers import PresetSerializer

            ret["presets"] = [
                PresetSerializer(p).data
                for p in Preset.objects.filter(platform=self.id).order_by("name")
            ]
        if include_num_scratches:
            ret["num_scratches"] = self.get_num_scratches()
        return ret

    @staticmethod
    def from_dict(platform_dict):
        platform_dict = copy.deepcopy(platform_dict)

        if "diff_flags" not in platform_dict or len(platform_dict["diff_flags"]) == 0:
            platform_dict["diff_flags"] = COMMON_DIFF_FLAGS
        else:
            platform_dict["diff_flags"] = [
                Flag.from_dict(flag) for flag in platform_dict["diff_flags"]
            ]

        return Platform(**platform_dict)


DUMMY_PLATFORM = Platform(
    id="dummy",
    name="Dummy System",
    description="DMY",
    arch="dummy",
)
