from dataclasses import dataclass


@dataclass(frozen=True)
class Asm:
    hash: str
    data: str

    @staticmethod
    def from_dict(asm_dict):
        return Asm(**asm_dict)
