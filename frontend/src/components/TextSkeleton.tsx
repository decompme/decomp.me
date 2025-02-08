import { useMemo } from "react";

export const CODE = `#include "common.h"

void step_game_loop(void) {
    PlayerData* playerData = &gPlayerData;
    const int MAX_GAME_TIME = 1000*60*60*60 - 1;

    update_input();

    gGameStatusPtr->frameCounter++;

    playerData->frameCounter += 2;
    if (playerData->frameCounter > MAX_GAME_TIME) {
        playerData->frameCounter = MAX_GAME_TIME;
    }

    update_max_rumble_duration();

    if (gGameStepDelayCount != 0) {
        gGameStepDelayCount-- ;
        if (gGameStepDelayCount == 0) {
            gGameStepDelayCount = gGameStepDelayAmount;
        } else {
            return;
        }
    }
}`;

export const DIFF = ` 0:    stwu    r1,-0x20(r1)
 4:    mflr    r0
 8:    lis     r3,ceRandomizerSimple@ha
 c:    stw     r0,0x24(r1)
10:    addi    r3,r3,ceRandomizerSimple@l
14:    lfs     f2,8(r3)
18:    fadds   f0,f2,f1
1c:    fctiwz  f1,f2
20:    stfs    f0,8(r3)
24:    fctiwz  f0,f0
28:    stfd    f1,8(r1)
2c:    stfd    f0,0x10(r1)
30:    lwz     r4,0xc(r1)
34:    lwz     r0,0x14(r1)
38:    cmpw    r4,r0
3c:    bne-    4c ~>
40:    lhz     r0,6(r3)
44:    sth     r0,4(r3)
48:    b       74 ~>
4c: ~> stfd    f0,0x10(r1)
50:    lhz     r4,4(r3)
54:    lwz     r0,0x14(r1)
58:    sth     r4,6(r3)
5c:    clrlwi. r0,r0,0x1b
60:    bne-    74 ~>
64:    lwz     r12,0(r3)
68:    lwz     r12,8(r12)
6c:    mtctr   r12
70:    bctrl
74: ~> lwz     r0,0x24(r1)
78:    mtlr    r0
7c:    addi    r1,r1,0x20
80:    blr`;

export const SCRATCH_LIST = `
    ==========================================================================
    |  PS1  function_80045024_34284                                 99%  MS  |
    ==========================================================================

    ==========================================================================
    |  N64  do_a_triple_jump                                        50%  MS  |
    ==========================================================================

    ==========================================================================
    |  PS2  sub_800321AC                                            20%  MS  |
    ==========================================================================

    ==========================================================================
    |  WII  load_some_cool_thing                                    12%  MS  |
    ==========================================================================

    ==========================================================================
    |  W95  spawn_ski_free_yeti_monster                             10%  MS  |
    ==========================================================================
`;

export function TextSkeleton({ text }: { text: string }) {
    const lines = useMemo(
        () =>
            text.split("\n").map((line) => {
                // Convert line into a sequence of [word len, space len] pairs.
                // e.g. "xxxx  xx xxx x" -> [[4, 2], [2, 1], [3, 1], [1, 0]]
                const pairs = [];

                let state: "word" | "space" = "word";
                let wordLen = 0;
                let spaceLen = 0;
                for (const char of line) {
                    if (char === " ") {
                        if (state === "word") {
                            pairs.push([wordLen, spaceLen]);
                            wordLen = 0;
                            spaceLen = 0;
                        }

                        state = "space";
                        spaceLen++;
                    } else {
                        // non-space
                        if (state === "space") {
                            pairs.push([wordLen, spaceLen]);
                            wordLen = 0;
                            spaceLen = 0;
                        }

                        state = "word";
                        wordLen++;
                    }
                }
                pairs.push([wordLen, spaceLen]);

                return pairs.filter(
                    ([wordLen, spaceLen]) => wordLen > 0 || spaceLen > 0,
                );
            }),
        [text],
    );

    return (
        <div className="flex flex-col gap-1">
            {lines.map((pairs, i) => (
                <div key={i} className="flex h-5">
                    {pairs.map(([wordLen, spaceLen], j) => (
                        <div
                            key={j}
                            className="h-full bg-gray-6"
                            style={{
                                width: `${wordLen}ch`,
                                marginRight: `${spaceLen}ch`,
                            }}
                        />
                    ))}
                </div>
            ))}
        </div>
    );
}
