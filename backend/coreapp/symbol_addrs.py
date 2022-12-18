from pathlib import Path
from typing import Dict, Optional


class Symbol:
    def __init__(self, label: str, ram_address: int, rom_address: Optional[int]):
        self.label = label
        self.ram_address = ram_address
        self.rom_address = rom_address


def symbol_name_from_asm_file(asm_file: Path) -> str:
    with asm_file.open("r") as f:
        lines = f.readlines()

    for line in lines:
        if line.startswith("glabel "):
            return line.split(" ")[1].strip()

    return ""


def parse_symbol_addrs(file_path: Path) -> Dict[str, Symbol]:
    with open(file_path, "r") as f:
        lines = f.readlines()

    symbol_addrs = {}

    for line in lines:
        name = line[: line.find(" ")]

        attributes = line[line.find("//") :].split(" ")
        ram_addr = int(line[: line.find(";")].split("=")[1].strip(), base=0)
        rom_addr = next(
            (
                int(attr.split(":")[1], base=0)
                for attr in attributes
                if attr.split(":")[0] == "rom"
            ),
            None,
        )

        symbol_addrs[name] = Symbol(name, ram_addr, rom_addr)

    return symbol_addrs
