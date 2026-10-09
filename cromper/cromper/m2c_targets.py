PLATFORM_ID_TO_M2C_ARCH = {
    # mips
    "irix": "mips",
    "n64": "mips",
    "ps1": "mipsel",
    "ps2": "mipsee",
    "psp": "mipsel",
    # ppc
    "wiiu": "ppc",
    "gc_wii": "ppc",
    "macosx": "ppc",
    # arm
    "gba": "gba",
    "n3ds": "arm",
    "nds_arm9": "arm",
    # superh
    "saturn": "sh2",
}


def resolve_m2c_target(platform_id: str, compiler_type: str) -> str | None:
    """Return the m2c target triple for a platform/compiler pair."""
    arch = PLATFORM_ID_TO_M2C_ARCH.get(platform_id)
    if arch is None:
        return None

    if compiler_type == "other":
        return arch
    return f"{arch}-{compiler_type}"
