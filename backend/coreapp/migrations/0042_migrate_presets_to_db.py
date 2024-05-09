import django.db.migrations.operations.special
from django.apps.registry import Apps
from django.db import migrations
from django.db.backends.base.schema import BaseDatabaseSchemaEditor
from django.db import transaction
from coreapp.models.preset import Preset
from coreapp.libraries import Library


def create_presets(apps: Apps, schema_editor: BaseDatabaseSchemaEditor) -> None:
    """
    Create all the previously hard-coded presets in the database
    """
    with transaction.atomic():
        db_preset = Preset(
            name="Rhythm Tengoku",
            compiler="agbcc",
            platform="gba",
            compiler_flags="-mthumb-interwork -Wparentheses -O2 -fhex-asm",
        )
        db_preset.save(force_insert=True)
        db_preset = Preset(
            name="The Minish Cap",
            compiler="agbcc",
            platform="gba",
            compiler_flags="-O2 -Wimplicit -Wparentheses -Werror -Wno-multichar -g3",
        )
        db_preset.save(force_insert=True)
        db_preset = Preset(
            name="Mother 3",
            compiler="agbccpp",
            platform="gba",
            compiler_flags="-fno-exceptions -fno-rtti -fhex-asm -mthumb-interwork -Wimplicit -Wparentheses -O2 -g3",
        )
        db_preset.save(force_insert=True)
        db_preset = Preset(
            name="Kirby and the Amazing Mirror",
            compiler="agbcc",
            platform="gba",
            compiler_flags="-mthumb-interwork -Wimplicit -Wparentheses -Werror -O2 -g -fhex-asm",
        )
        db_preset.save(force_insert=True)
        db_preset = Preset(
            name="Pokemon Mystery Dungeon: Red Rescue Team",
            compiler="agbcc",
            platform="gba",
            compiler_flags="-mthumb-interwork -Wimplicit -Wparentheses -Wunused -Werror -O2 -fhex-asm -g",
        )
        db_preset.save(force_insert=True)
        db_preset = Preset(
            name="Pokemon Pinball: Ruby and Sapphire",
            compiler="agbcc",
            platform="gba",
            compiler_flags="-mthumb-interwork -Wimplicit -Wparentheses -Werror -O2 -g -fhex-asm -fprologue-bugfix",
        )
        db_preset.save(force_insert=True)
        db_preset = Preset(
            name="Ocarina of Time 3D",
            compiler="armcc_40_821",
            platform="n3ds",
            compiler_flags="--cpp --arm --split_sections --debug --no_debug_macros --gnu --debug_info=line_inlining_extensions -O3 -Otime --data_reorder --signed_chars --multibyte_chars --remove_unneeded_entities --force_new_nothrow --remarks --no_rtti",
        )
        db_preset.save(force_insert=True)
        db_preset = Preset(
            name="Super Mario 3D Land",
            compiler="armcc_41_894",
            platform="n3ds",
            compiler_flags="--cpp --arm -O3 -Otime --no_rtti_data --no_rtti --no_exceptions --vfe --data_reorder --signed_chars --multibyte_chars --locale=japanese --force_new_nothrow --remarks",
        )
        db_preset.save(force_insert=True)
        db_preset = Preset(
            name="Ikachan 3DS",
            compiler="armcc_41_894",
            platform="n3ds",
            compiler_flags="--cpp --arm -O3 -Otime --no_rtti_data --no_rtti --no_exceptions --vfe --data_reorder --signed_chars --multibyte_chars --locale=japanese --force_new_nothrow --remarks",
        )
        db_preset.save(force_insert=True)
        db_preset = Preset(
            name="Super Mario Odyssey",
            compiler="clang-3.9.1",
            platform="switch",
            compiler_flags="-x c++ -O3 -g2 -std=c++1z -fno-rtti -fno-exceptions -Wall -Wextra -Wdeprecated -Wno-unused-parameter -Wno-unused-private-field -fno-strict-aliasing -Wno-invalid-offsetof -D SWITCH -D NNSDK -D MATCHING_HACK_NX_CLANG",
        )
        db_preset.save(force_insert=True)
        db_preset = Preset(
            name="Breath of the Wild",
            compiler="clang-4.0.1",
            platform="switch",
            compiler_flags="-x c++ -O3 -g2 -std=c++1z -fno-rtti -fno-exceptions -Wall -Wextra -Wdeprecated -Wno-unused-parameter -Wno-unused-private-field -fno-strict-aliasing -Wno-invalid-offsetof -D SWITCH -D NNSDK -D MATCHING_HACK_NX_CLANG",
        )
        db_preset.save(force_insert=True)
        db_preset = Preset(
            name="Splatoon 2 3.1.0",
            compiler="clang-4.0.1",
            platform="switch",
            compiler_flags="-x c++ -O3 -g2 -std=c++1z -fno-rtti -fno-exceptions -Wall -Wextra -Wdeprecated -Wno-unused-parameter -Wno-unused-private-field -fno-strict-aliasing -Wno-invalid-offsetof -D SWITCH -D NNSDK -D MATCHING_HACK_NX_CLANG",
        )
        db_preset.save(force_insert=True)
        db_preset = Preset(
            name="Super Mario 3D World + Bowser's Fury",
            compiler="clang-8.0.0",
            platform="switch",
            compiler_flags="-x c++ -O3 -g2 -std=c++17 -fno-rtti -fno-exceptions -Wall -Wextra -Wdeprecated -Wno-unused-parameter -Wno-unused-private-field -fno-strict-aliasing -Wno-invalid-offsetof -D SWITCH -D NNSDK -D MATCHING_HACK_NX_CLANG",
        )
        db_preset.save(force_insert=True)
        db_preset = Preset(
            name="Castlevania: Symphony of the Night",
            compiler="psyq3.5",
            platform="ps1",
            compiler_flags="-O2 -G0 -fsigned-char",
        )
        db_preset.save(force_insert=True)
        db_preset = Preset(
            name="Evo's Space Adventures",
            compiler="gcc2.95.2-mipsel",
            platform="ps1",
            compiler_flags="-mgpopt -mgpOPT -msoft-float -msplit-addresses -mno-abicalls -fno-builtin -fsigned-char -gcoff -O2 -G8",
        )
        db_preset.save(force_insert=True)
        db_preset = Preset(
            name="Frogger",
            compiler="gcc2.6.3-mipsel",
            platform="ps1",
            compiler_flags="-O3 -G0 -gcoff -w -fpeephole -ffunction-cse -fpcc-struct-return -fcommon -fverbose-asm -funsigned-char -msoft-float -g -Wa,--expand-div",
        )
        db_preset.save(force_insert=True)
        db_preset = Preset(
            name="Legacy of Kain: Soul Reaver",
            compiler="psyq4.4",
            platform="ps1",
            compiler_flags="-O2 -G65536",
        )
        db_preset.save(force_insert=True)
        db_preset = Preset(
            name="Metal Gear Solid",
            compiler="psyq4.4",
            platform="ps1",
            compiler_flags="-O2 -G8",
        )
        db_preset.save(force_insert=True)
        db_preset = Preset(
            name="Metal Gear Solid (overlays)",
            compiler="psyq4.4",
            platform="ps1",
            compiler_flags="-O2 -G0 -Wall",
        )
        db_preset.save(force_insert=True)
        db_preset = Preset(
            name="vib-ribbon",
            compiler="gcc2.91.66-mipsel",
            platform="ps1",
            compiler_flags="-Os -G4 -mel -g0 -mno-abicalls -fno-builtin -fsigned-char -fpeephole -ffunction-cse -fkeep-static-consts -fpcc-struct-return -fcommon -fgnu-linker -fargument-alias -msplit-addresses -mgas -mgpOPT -mgpopt -msoft-float -gcoff",
        )
        db_preset.save(force_insert=True)
        db_preset = Preset(
            name="Castlevania: Symphony of the Night (saturn)",
            compiler="cygnus-2.7-96Q3",
            platform="saturn",
            compiler_flags="-O2 -m2 -fsigned-char",
        )
        db_preset.save(force_insert=True)
        db_preset = Preset(
            name="AeroGauge",
            compiler="ido5.3",
            platform="n64",
            compiler_flags="-O2 -mips2",
        )
        db_preset.save(force_insert=True)
        db_preset = Preset(
            name="AeroGauge JP Kiosk Demo",
            compiler="ido5.3",
            platform="n64",
            compiler_flags="-O2 -mips1",
        )
        db_preset.save(force_insert=True)
        db_preset = Preset(
            name="Bomberman Hero",
            compiler="ido5.3",
            platform="n64",
            compiler_flags="-g -mips1",
        )
        db_preset.save(force_insert=True)
        db_preset = Preset(
            name="Chameleon Twist 1",
            compiler="ido5.3",
            platform="n64",
            compiler_flags="-O2 -mips2",
            diff_flags=["-Mreg-names=32"],
        )
        db_preset.save(force_insert=True)
        db_preset = Preset(
            name="Chameleon Twist 2",
            compiler="ido5.3",
            platform="n64",
            compiler_flags="-O2 -mips2",
            diff_flags=["-Mreg-names=32"],
        )
        db_preset.save(force_insert=True)
        db_preset = Preset(
            name="Diddy Kong Racing",
            compiler="ido5.3",
            platform="n64",
            compiler_flags="-O2 -mips1",
        )
        db_preset.save(force_insert=True)
        db_preset = Preset(
            name="Dinosaur Planet",
            compiler="ido5.3",
            platform="n64",
            compiler_flags="-O2 -g3 -mips2",
        )
        db_preset.save(force_insert=True)
        db_preset = Preset(
            name="Dinosaur Planet (DLLs)",
            compiler="ido5.3",
            platform="n64",
            compiler_flags="-O2 -g3 -mips2 -KPIC",
        )
        db_preset.save(force_insert=True)
        db_preset = Preset(
            name="Donkey Kong 64",
            compiler="ido5.3",
            platform="n64",
            compiler_flags="-O2 -mips2",
        )
        db_preset.save(force_insert=True)
        db_preset = Preset(
            name="Dr. Mario 64 N64",
            compiler="gcc2.7.2kmc",
            platform="n64",
            compiler_flags="-O2 -mips3 -DVERSION_US=1",
            diff_flags=["-Mreg-names=32"],
        )
        db_preset.save(force_insert=True)
        db_preset = Preset(
            name="Dr. Mario 64 iQue",
            compiler="egcs_1.1.2-4",
            platform="n64",
            compiler_flags="-O2 -g -mips2 -mcpu=4300 -funsigned-char -DVERSION_CN=1",
            diff_flags=["-Mreg-names=32"],
        )
        db_preset.save(force_insert=True)
        db_preset = Preset(
            name="GoldenEye / Perfect Dark",
            compiler="ido5.3",
            platform="n64",
            compiler_flags="-Olimit 2000 -mips2 -O2",
        )
        db_preset.save(force_insert=True)
        db_preset = Preset(
            name="libultra iQue",
            compiler="egcs_1.1.2-4",
            platform="n64",
            compiler_flags="-O2 -mips2 -mcpu=4300 -mno-abicalls",
            diff_flags=["-Mreg-names=32"],
        )
        db_preset.save(force_insert=True)
        db_preset = Preset(
            name="Majora's Mask",
            compiler="ido7.1",
            platform="n64",
            compiler_flags="-O2 -g3 -mips2 -woff 624",
            diff_flags=["-Mreg-names=32"],
        )
        db_preset.save(force_insert=True)
        db_preset = Preset(
            name="Mario Kart 64",
            compiler="ido5.3",
            platform="n64",
            compiler_flags="-O2 -mips2",
        )
        db_preset.save(force_insert=True)
        db_preset = Preset(
            name="Mario Party 1",
            compiler="gcc2.7.2kmc",
            platform="n64",
            compiler_flags="-O1 -mips3",
            diff_flags=["-Mreg-names=32"],
        )
        db_preset.save(force_insert=True)
        db_preset = Preset(
            name="Mario Party 2",
            compiler="gcc2.7.2kmc",
            platform="n64",
            compiler_flags="-O1 -mips3",
            diff_flags=["-Mreg-names=32"],
        )
        db_preset.save(force_insert=True)
        db_preset = Preset(
            name="Mario Party 3",
            compiler="gcc2.7.2kmc",
            platform="n64",
            compiler_flags="-O1 -mips3",
            diff_flags=["-Mreg-names=32"],
        )
        db_preset.save(force_insert=True)
        db_preset = Preset(
            name="Ocarina of Time",
            compiler="ido7.1",
            platform="n64",
            compiler_flags="-O2 -mips2",
            diff_flags=["-Mreg-names=32"],
        )
        db_preset.save(force_insert=True)
        db_preset = Preset(
            name="Paper Mario",
            compiler="gcc2.8.1pm",
            platform="n64",
            compiler_flags="-O2 -fforce-addr -gdwarf-2",
            diff_flags=["-Mreg-names=32"],
        )
        db_preset.save(force_insert=True)
        db_preset = Preset(
            name="Pokémon Puzzle League",
            compiler="gcc2.7.2kmc",
            platform="n64",
            compiler_flags="-O2 -mips3 -g",
            diff_flags=["-Mreg-names=32"],
        )
        db_preset.save(force_insert=True)
        db_preset = Preset(
            name="Quest64",
            compiler="ido5.3",
            platform="n64",
            compiler_flags="-O2 -g3 -mips2",
            diff_flags=["-Mreg-names=32"],
        )
        db_preset.save(force_insert=True)
        db_preset = Preset(
            name="Rocket Robot on Wheels",
            compiler="gcc2.7.2snew",
            platform="n64",
            compiler_flags="-mips2 -O2 -gdwarf -funsigned-char",
            diff_flags=["-Mreg-names=32"],
        )
        db_preset.save(force_insert=True)
        db_preset = Preset(
            name="Shadowgate 64",
            compiler="gcc2.7.2kmc",
            platform="n64",
            compiler_flags="-mips2 -O1 -g2",
            diff_flags=["-Mreg-names=32"],
        )
        db_preset.save(force_insert=True)
        db_preset = Preset(
            name="Space Station Silicon Valley",
            compiler="ido5.3",
            platform="n64",
            compiler_flags="-O2 -mips2 -Xfullwarn -signed -nostdinc",
            diff_flags=["-Mreg-names=32"],
        )
        db_preset.save(force_insert=True)
        db_preset = Preset(
            name="Starfox 64",
            compiler="ido5.3",
            platform="n64",
            compiler_flags="-O2 -g3 -mips2",
        )
        db_preset.save(force_insert=True)
        db_preset = Preset(
            name="Super Mario 64",
            compiler="ido5.3",
            platform="n64",
            compiler_flags="-O1 -g -mips2",
            diff_flags=["-Mreg-names=32"],
        )
        db_preset.save(force_insert=True)
        db_preset = Preset(
            name="Super Smash Bros.",
            compiler="ido7.1",
            platform="n64",
            compiler_flags="-O2 -mips2",
            diff_flags=["-Mreg-names=32"],
        )
        db_preset.save(force_insert=True)
        db_preset = Preset(
            name="Duke Nukem Zero Hour",
            compiler="gcc2.7.2kmc",
            platform="n64",
            compiler_flags="-O2 -g2 -mips3",
            diff_flags=["-Mreg-names=32"],
        )
        db_preset.save(force_insert=True)
        db_preset = Preset(
            name="Wave Race 64",
            compiler="ido5.3",
            platform="n64",
            compiler_flags="-O2 -mips2",
        )
        db_preset.save(force_insert=True)
        db_preset = Preset(
            name="Animal Forest",
            compiler="ido7.1",
            platform="n64",
            compiler_flags="-O2 -g3 -mips2",
        )
        db_preset.save(force_insert=True)
        db_preset = Preset(
            name="IDO 5.3 cc",
            compiler="ido5.3_irix",
            platform="irix",
            compiler_flags="-KPIC -mips1 -O1 -fullwarn",
            diff_flags=["-Mreg-names=32"],
        )
        db_preset.save(force_insert=True)
        db_preset = Preset(
            name="IDO 5.3 libraries",
            compiler="ido5.3_irix",
            platform="irix",
            compiler_flags="-KPIC -mips1 -O2 -fullwarn",
            diff_flags=["-Mreg-names=32"],
        )
        db_preset.save(force_insert=True)
        db_preset = Preset(
            name="IDO 5.3 Pascal",
            compiler="ido5.3Pascal",
            platform="irix",
            compiler_flags="-KPIC -mips1 -O2 -fullwarn",
            diff_flags=["-Mreg-names=32"],
        )
        db_preset.save(force_insert=True)
        db_preset = Preset(
            name="IDO 7.1 cc",
            compiler="ido7.1_irix",
            platform="irix",
            compiler_flags="-KPIC -mips2 -O1 -fullwarn",
            diff_flags=["-Mreg-names=32"],
        )
        db_preset.save(force_insert=True)
        db_preset = Preset(
            name="IDO 7.1 libraries",
            compiler="ido7.1_irix",
            platform="irix",
            compiler_flags="-KPIC -mips2 -O2 -fullwarn",
            diff_flags=["-Mreg-names=32"],
        )
        db_preset.save(force_insert=True)
        db_preset = Preset(
            name="IDO 7.1 Pascal",
            compiler="ido7.1Pascal",
            platform="irix",
            compiler_flags="-KPIC -mips2 -O2 -fullwarn",
            diff_flags=["-Mreg-names=32"],
        )
        db_preset.save(force_insert=True)
        db_preset = Preset(
            name="7.1 N64 SDK",
            compiler="ido7.1_irix",
            platform="irix",
            compiler_flags="-KPIC -mips2 -g -fullwarn",
            diff_flags=["-Mreg-names=32"],
        )
        db_preset.save(force_insert=True)
        db_preset = Preset(
            name="Super Monkey Ball",
            compiler="mwcc_233_159",
            platform="gc_wii",
            compiler_flags="-O4,p -nodefaults -fp hard -Cpp_exceptions off -enum int -inline auto",
        )
        db_preset.save(force_insert=True)
        db_preset = Preset(
            name="Super Mario Sunshine",
            compiler="mwcc_233_163",
            platform="gc_wii",
            compiler_flags="-lang=c++ -Cpp_exceptions off -fp hard -O4 -nodefaults -enum int -rostr",
        )
        db_preset.save(force_insert=True)
        db_preset = Preset(
            name="Pikmin",
            compiler="mwcc_233_163n",
            platform="gc_wii",
            compiler_flags="-lang=c++ -nodefaults -Cpp_exceptions off -RTTI on -fp hard -O4,p -common on",
        )
        db_preset.save(force_insert=True)
        db_preset = Preset(
            name="Super Smash Bros. Melee",
            compiler="mwcc_233_163n",
            platform="gc_wii",
            compiler_flags="-O4,p -nodefaults -proc gekko -fp hard -Cpp_exceptions off -enum int -fp_contract on -inline auto -DM2CTX -DMUST_MATCH -DWIP",
        )
        db_preset.save(force_insert=True)
        db_preset = Preset(
            name="Kirby Air Ride",
            compiler="mwcc_242_81",
            platform="gc_wii",
            compiler_flags="-O4,p -nodefaults -fp hard -Cpp_exceptions off -enum int -fp_contract on -inline auto",
        )
        db_preset.save(force_insert=True)
        db_preset = Preset(
            name="Battle for Bikini Bottom",
            compiler="mwcc_247_92",
            platform="gc_wii",
            compiler_flags='-DMASTER -fp_contract on -RTTI off -nodefaults -Cpp_exceptions off -schedule on -opt level=4,peephole,speed -lang=c++ -char unsigned -str reuse,pool,readonly -fp hard -use_lmw_stmw on -pragma "cpp_extensions on" -sym on -enum int -inline off',
        )
        db_preset.save(force_insert=True)
        db_preset = Preset(
            name="Mario Kart: Double Dash",
            compiler="mwcc_247_105",
            platform="gc_wii",
            compiler_flags="-lang=c++ -use_lmw_stmw on -inline on -O4 -char signed -Cpp_exceptions off -fp_contract on -fp fmadd -enum int",
        )
        db_preset.save(force_insert=True)
        db_preset = Preset(
            name="Pikmin 2",
            compiler="mwcc_247_107",
            platform="gc_wii",
            compiler_flags="-lang=c++ -nodefaults -Cpp_exceptions off -RTTI off -fp hard -fp_contract on -rostr -O4,p -use_lmw_stmw on -enum int -inline auto -sdata 8 -sdata2 8 -common on",
        )
        db_preset.save(force_insert=True)
        db_preset = Preset(
            name="The Thousand-Year Door",
            compiler="mwcc_247_108",
            platform="gc_wii",
            compiler_flags="-fp hard -fp_contract on -enum int -O4,p -sdata 48 -sdata2 6 -rostr -multibyte -use_lmw_stmw on -inline deferred -Cpp_exceptions off",
        )
        db_preset.save(force_insert=True)
        db_preset = Preset(
            name="Twilight Princess (DOL)",
            compiler="mwcc_247_108",
            platform="gc_wii",
            compiler_flags="-lang=c++ -Cpp_exceptions off -nodefaults -O3 -fp hard -msgstyle gcc -str pool,readonly,reuse -RTTI off -maxerrors 1 -enum int",
        )
        db_preset.save(force_insert=True)
        db_preset = Preset(
            name="Twilight Princess (REL)",
            compiler="mwcc_247_108",
            platform="gc_wii",
            compiler_flags="-lang=c++ -Cpp_exceptions off -nodefaults -O3 -fp hard -msgstyle gcc -str pool,readonly,reuse -RTTI off -maxerrors 1 -enum int -sdata 0 -sdata2 0",
        )
        db_preset.save(force_insert=True)
        db_preset = Preset(
            name="Twilight Princess (Dolphin)",
            compiler="mwcc_233_163e",
            platform="gc_wii",
            compiler_flags="-lang=c -Cpp_exceptions off -nodefaults -O4,p -fp hard -str reuse -maxerrors 1 -enum int",
        )
        db_preset.save(force_insert=True)
        db_preset = Preset(
            name="The Wind Waker (DOL)",
            compiler="mwcc_242_81",
            platform="gc_wii",
            compiler_flags="-lang=c++ -Cpp_exceptions off -schedule off -inline noauto -nodefaults -O3,s -fp hard -msgstyle gcc -str pool,readonly,reuse -RTTI off -maxerrors 1 -enum int -sym on",
        )
        db_preset.save(force_insert=True)
        db_preset = Preset(
            name="The Wind Waker (REL)",
            compiler="mwcc_242_81",
            platform="gc_wii",
            compiler_flags="-lang=c++ -Cpp_exceptions off -schedule off -inline noauto -nodefaults -O3,s -fp hard -msgstyle gcc -str pool,readonly,reuse -RTTI off -maxerrors 1 -enum int -sym on -sdata 0 -sdata2 0",
        )
        db_preset.save(force_insert=True)
        db_preset = Preset(
            name="Super Paper Mario (DOL)",
            compiler="mwcc_41_60831",
            platform="gc_wii",
            compiler_flags="-enc SJIS -lang c++ -W all -fp fmadd -Cpp_exceptions off -O4 -use_lmw_stmw on -str pool -rostr -sym on -ipa file -inline all -sdata 4 -sdata2 4",
        )
        db_preset.save(force_insert=True)
        db_preset = Preset(
            name="Super Paper Mario (REL)",
            compiler="mwcc_41_60831",
            platform="gc_wii",
            compiler_flags="-enc SJIS -lang c++ -W all -fp fmadd -Cpp_exceptions off -O4 -use_lmw_stmw on -str pool -rostr -sym on -ipa file -sdata 0 -sdata2 0 -pool off -ordered-fp-compares",
        )
        db_preset.save(force_insert=True)
        db_preset = Preset(
            name="Wii Sports",
            compiler="mwcc_41_60831",
            platform="gc_wii",
            compiler_flags="-lang=c++ -enum int -inline auto -Cpp_exceptions off -RTTI off -fp hard -O4,p -nodefaults",
        )
        db_preset.save(force_insert=True)
        db_preset = Preset(
            name="Super Mario Galaxy",
            compiler="mwcc_41_60126",
            platform="gc_wii",
            compiler_flags="-Cpp_exceptions off -stdinc -nodefaults -fp hard -lang=c++ -inline auto,level=2 -ipa file -O4,s -rtti off -sdata 4 -sdata2 4 -enum int",
        )
        db_preset.save(force_insert=True)
        db_preset = Preset(
            name="Super Mario Galaxy 2",
            compiler="mwcc_43_172",
            platform="gc_wii",
            compiler_flags="-lang=c++ -Cpp_exceptions off -nodefaults -cwd explicit -proc gekko -fp hard -ipa file -inline auto -rtti off -align powerpc -enum int -O4,s -sdata 4 -sdata2 4",
        )
        db_preset.save(force_insert=True)
        db_preset = Preset(
            name="Super Mario Galaxy 2 (RVL)",
            compiler="mwcc_43_172",
            platform="gc_wii",
            compiler_flags="-lang=c99 -Cpp_exceptions off -nodefaults -cwd explicit -proc gekko -fp hard -ipa file -inline auto -rtti off -align powerpc -enum int -O4,p -sdata 8 -sdata2 8",
        )
        db_preset.save(force_insert=True)
        db_preset = Preset(
            name="Xenoblade Chronicles (JP)",
            compiler="mwcc_43_151",
            platform="gc_wii",
            compiler_flags="-lang=c++ -O4,p -nodefaults -proc gecko -str pool,readonly,reuse -enum int -fp hard -RTTI on -ipa file -enc SJIS",
        )
        db_preset.save(force_insert=True)
        db_preset = Preset(
            name="Xenoblade Chronicles (JP) (Wii SDK)",
            compiler="mwcc_43_151",
            platform="gc_wii",
            compiler_flags="-lang=c99 -O4,p -nodefaults  -proc gekko -inline auto -str pool -enum int -fp hard  -ipa file -func_align 16",
        )
        db_preset.save(force_insert=True)
        db_preset = Preset(
            name="Mario Party 4",
            compiler="mwcc_242_81",
            platform="gc_wii",
            compiler_flags="-O0,p -str pool -fp hard -Cpp_exceptions off",
        )
        db_preset.save(force_insert=True)
        db_preset = Preset(
            name="Mario Kart Wii (DOL)",
            compiler="mwcc_42_127",
            platform="gc_wii",
            compiler_flags="-nodefaults -align powerpc -enc SJIS -proc gekko -enum int -O4,p -inline auto -W all -fp hardware -W noimplicitconv -w notinlined -w nounwanted -DREVOKART -Cpp_exceptions off -RTTI off -nostdinc -msgstyle gcc -func_align 4 -sym dwarf-2 -lang=c++ -ipa file -rostr -sdata 0 -sdata2 0",
        )
        db_preset.save(force_insert=True)
        db_preset = Preset(
            name="Mario Kart Wii (RVL_SDK)",
            compiler="mwcc_41_60831",
            platform="gc_wii",
            compiler_flags="-nodefaults -align powerpc -enc SJIS -proc gekko -enum int -O4,p -inline auto -W all -fp hardware -W noimplicitconv -w notinlined -w nounwanted -DREVOKART -Cpp_exceptions off -RTTI off -nostdinc -msgstyle gcc -func_align 4 -sym dwarf-2 -lang=c99 -ipa file",
        )
        db_preset.save(force_insert=True)
        db_preset = Preset(
            name="Mario Kart Wii (MSL)",
            compiler="mwcc_42_127",
            platform="gc_wii",
            compiler_flags="-nodefaults -align powerpc -enc SJIS -proc gekko -enum int -O4,p -inline auto -W all -fp hardware -W noimplicitconv -w notinlined -w nounwanted -DREVOKART -Cpp_exceptions off -RTTI off -nostdinc -msgstyle gcc -func_align 4 -sym dwarf-2 -lang=c99 -ipa file",
        )
        db_preset.save(force_insert=True)
        db_preset = Preset(
            name="Mario Kart Wii (NintendoWare)",
            compiler="mwcc_42_127",
            platform="gc_wii",
            compiler_flags='-nodefaults -align powerpc -enc SJIS -proc gekko -enum int -O4,p -inline auto -W all -fp hardware -W noimplicitconv -w notinlined -w nounwanted -DREVOKART -Cpp_exceptions off -RTTI off -nostdinc -msgstyle gcc -func_align 4 -sym dwarf-2 -lang=c++ -ipa file -inline auto -O4,p -pragma "legacy_struct_alignment on"',
        )
        db_preset.save(force_insert=True)
        db_preset = Preset(
            name="Mario Kart Wii (DWC/GameSpy)",
            compiler="mwcc_41_60831",
            platform="gc_wii",
            compiler_flags="-nodefaults -align powerpc -enc SJIS -proc gekko -enum int -O4,p -inline auto -W all -fp hardware -W noimplicitconv -w notinlined -w nounwanted -DREVOKART -Cpp_exceptions off -RTTI off -nostdinc -msgstyle gcc -func_align 4 -sym dwarf-2 -lang=c99 -ipa file -w nounusedexpr -w nounusedarg",
        )
        db_preset.save(force_insert=True)
        db_preset = Preset(
            name="Mario Kart Wii (EGG)",
            compiler="mwcc_42_127",
            platform="gc_wii",
            compiler_flags="-nodefaults -align powerpc -enc SJIS -proc gekko -enum int -O4,p -inline auto -W all -fp hardware -W noimplicitconv -w notinlined -w nounwanted -DREVOKART -Cpp_exceptions off -RTTI off -nostdinc -msgstyle gcc -func_align 4 -sym dwarf-2 -lang=c++ -ipa function -rostr",
        )
        db_preset.save(force_insert=True)
        db_preset = Preset(
            name="Mario Kart Wii (REL)",
            compiler="mwcc_42_127",
            platform="gc_wii",
            compiler_flags='-nodefaults -align powerpc -enc SJIS -proc gekko -enum int -O4,p -inline auto -W all -fp hardware -W noimplicitconv -w notinlined -w nounwanted -DREVOKART -Cpp_exceptions off -RTTI off -nostdinc -msgstyle gcc -func_align 4 -sym dwarf-2 -lang=c++ -ipa file -rostr -sdata 0 -sdata2 0 -use_lmw_stmw=on -pragma "legacy_struct_alignment on"',
        )
        db_preset.save(force_insert=True)
        db_preset = Preset(
            name="Metroid Prime (USA)",
            compiler="mwcc_242_81",
            platform="gc_wii",
            compiler_flags="-lang=c++ -nodefaults -Cpp_exceptions off -RTTI off -fp hard -fp_contract on -str reuse,pool,readonly -rostr -O4,p -maxerrors 1 -use_lmw_stmw on -enum int -inline deferred,noauto -common on",
        )
        db_preset.save(force_insert=True)
        db_preset = Preset(
            name="Luigi's Mansion",
            compiler="mwcc_233_159",
            platform="gc_wii",
            compiler_flags="-lang=c++ -O4,p -nodefaults -fp hard -inline auto",
        )
        db_preset.save(force_insert=True)
        db_preset = Preset(
            name="Ratatouille Prototype (Debug)",
            compiler="mwcc_247_108",
            platform="gc_wii",
            compiler_flags='-fp_contract on -pool off -RTTI off -nodefaults -Cpp_exceptions off -schedule on -lang=c++ -char signed -str reuse,pool,readonly -fp fmadd -use_lmw_stmw on -pragma "cpp_extensions on" -sym on -enum int -inline off -DDEBUG -DRWDEBUG -opt peep, speed -sdata 20 -sdata2 20',
        )
        db_preset.save(force_insert=True)
        db_preset = Preset(
            name="Ratatouille Prototype (Release)",
            compiler="mwcc_247_108",
            platform="gc_wii",
            compiler_flags='-fp_contract on -pool off -RTTI off -nodefaults -Cpp_exceptions off -schedule on -lang=c++ -char signed -str reuse,pool,readonly -fp fmadd -use_lmw_stmw on -pragma "cpp_extensions on" -sym on -enum int -inline off -DRELEASE -opt level=4, peep, speed-sdata 24 -sdata2 24',
        )
        db_preset.save(force_insert=True)
        db_preset = Preset(
            name="Ratatouille Prototype (Master w/ Debug)",
            compiler="mwcc_247_108",
            platform="gc_wii",
            compiler_flags='-fp_contract on -pool off -RTTI off -nodefaults -Cpp_exceptions off -schedule on -lang=c++ -char signed -str reuse,pool,readonly -fp fmadd -use_lmw_stmw on -pragma "cpp_extensions on" -sym on -enum int -inline off -DMASTERDEBUG -opt level=4, peep, space -sdata 64 -sdata2 64',
        )
        db_preset.save(force_insert=True)
        db_preset = Preset(
            name="Ratatouille Prototype (Master)",
            compiler="mwcc_247_108",
            platform="gc_wii",
            compiler_flags='-fp_contract on -pool off -RTTI off -nodefaults -Cpp_exceptions off -schedule on -lang=c++ -char signed -str reuse,pool,readonly -fp fmadd -use_lmw_stmw on -pragma "cpp_extensions on" -sym on -enum int -inline off -DMASTER -opt level=4, peep, space -sdata 64 -sdata2 64',
        )
        db_preset.save(force_insert=True)
        db_preset = Preset(
            name="Ty the Tasmanian Tiger",
            compiler="mwcc_242_81",
            platform="gc_wii",
            compiler_flags="-lang=c++ -fp hard -sym on -nodefaults -enum int -O4,p -inline auto -str reuse -Cpp_exceptions off",
        )
        db_preset.save(force_insert=True)
        db_preset = Preset(
            name="Animal Crossing (REL)",
            compiler="mwcc_242_81r",
            platform="gc_wii",
            compiler_flags="-O4 -fp hard -sdata 0 -sdata2 0 -Cpp_exceptions off -enum int -sym on",
        )
        db_preset.save(force_insert=True)
        db_preset = Preset(
            name="Animal Crossing (DOL)",
            compiler="mwcc_242_81",
            platform="gc_wii",
            compiler_flags="-O4 -fp hard -sdata 8 -sdata2 8 -Cpp_exceptions off -char unsigned -enum int",
        )
        db_preset.save(force_insert=True)
        db_preset = Preset(
            name="Pokémon Diamond / Pearl",
            compiler="mwcc_30_123",
            platform="nds_arm9",
            compiler_flags="-O4,p -enum int -proc arm946e -gccext,on -fp soft -lang c99 -inline on,noauto -Cpp_exceptions off -gccinc -interworking -gccdep -MD -g",
        )
        db_preset.save(force_insert=True)
        db_preset = Preset(
            name="Pokémon HeartGold / SoulSilver",
            compiler="mwcc_30_137",
            platform="nds_arm9",
            compiler_flags="-O4,p -enum int -proc arm946e -gccext,on -fp soft -lang c99 -char signed -inline on,noauto -Cpp_exceptions off -gccinc -interworking -gccdep -MD -g",
        )
        db_preset.save(force_insert=True)
        db_preset = Preset(
            name="Pokémon Mystery Dungeon: Explorers of Sky",
            compiler="mwcc_30_137",
            platform="nds_arm9",
            compiler_flags="-O4,s -enum int -proc arm946e -gccext,on -fp soft -lang c99 -char signed -inline on,noauto -Cpp_exceptions off -gccinc -interworking -gccdep -MD -g",
        )
        db_preset.save(force_insert=True)
        db_preset = Preset(
            name="Fallout 2",
            compiler="gcc3-1041",
            platform="macosx",
            compiler_flags="-std=c99 -fPIC -O1 -g3",
        )
        db_preset.save(force_insert=True)
        db_preset = Preset(
            name="The Sims 2",
            compiler="gcc-5026-cpp",
            platform="macosx",
            compiler_flags="-g3 -O1",
        )
        db_preset.save(force_insert=True)
        db_preset = Preset(
            name="Ty the Tasmanian Tiger (July 1st)",
            compiler="ee-gcc2.9-991111a",
            platform="ps2",
            compiler_flags="-x c++ -O2 -fno-exceptions -gstabs -ffast-math -finline-functions",
        )
        db_preset.save(force_insert=True)
        db_preset = Preset(
            name="Sunny Garcia Surfing",
            compiler="ee-gcc2.9-991111a",
            platform="ps2",
            compiler_flags="-x c++ -O2 -fno-exceptions -gstabs -ffast-math",
        )
        db_preset.save(force_insert=True)
        db_preset = Preset(
            name="Klonoa 2: Lunatea's Veil (C)",
            compiler="ee-gcc2.9-991111-01",
            platform="ps2",
            compiler_flags="-O1 -gstabs",
        )
        db_preset.save(force_insert=True)
        db_preset = Preset(
            name="Klonoa 2: Lunatea's Veil (C++)",
            compiler="ee-gcc2.9-991111-01",
            platform="ps2",
            compiler_flags="-x c++ -O2 -gstabs -fno-exceptions -finline-functions",
        )
        db_preset.save(force_insert=True)
        db_preset = Preset(
            name="Kingdom Hearts",
            compiler="ee-gcc2.96",
            platform="ps2",
            compiler_flags="-O2 -G0 -g",
        )
        db_preset.save(force_insert=True)
        db_preset = Preset(
            name="LEGO Island",
            compiler="msvc4.2",
            platform="win9x",
            compiler_flags="/W3 /GX /O2 /TP",
            libraries=[Library(name="directx", version="5.0")],
        )
        db_preset.save(force_insert=True)
        db_preset = Preset(
            name="Touhou 6 (C)",
            compiler="msvc7.0",
            platform="win9x",
            compiler_flags="/MT /G5 /GS /Od /Oi /Ob1",
            libraries=[Library(name="directx", version="8.0")],
        )
        db_preset.save(force_insert=True)
        db_preset = Preset(
            name="Touhou 6 (C++)",
            compiler="msvc7.0",
            platform="win9x",
            compiler_flags="/MT /EHsc /G5 /GS /Od /Oi /Ob1 /TP",
            libraries=[Library(name="directx", version="8.0")],
        )
        db_preset.save(force_insert=True)


class Migration(migrations.Migration):
    dependencies = [
        ("coreapp", "0041_remove_project_and_github_stuff"),
        ("coreapp", "0054_presets_owner"),
    ]

    operations = [
        migrations.RunPython(
            code=create_presets,
            reverse_code=django.db.migrations.operations.special.RunPython.noop,
        )
    ]
