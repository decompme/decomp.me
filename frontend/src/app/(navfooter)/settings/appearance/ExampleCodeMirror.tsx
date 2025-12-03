"use client";

import CodeMirror from "@/components/Editor/CodeMirror";
import basicSetup from "@/lib/codemirror/basic-setup";
import { cpp } from "@/lib/codemirror/cpp";

const EXAMPLE_C_CODE = `#include "common.h"

typedef struct Vec2b {
    /* 0x00 */ s8 x;
    /* 0x01 */ s8 y;
} Vec2b; // size = 0x02

void step_game_loop(void) {
    PlayerData* playerData = &gPlayerData;
    const int MAX_GAME_TIME = 1000*60*60*60 - 1; // 1000 hours minus one frame at 60 fps

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

    func_8011BAE8();
    npc_iter_no_op();
    update_generic_entities();
    update_triggers();
    update_scripts();
    update_messages();
    update_hud_elements();
    step_current_game_mode();
    update_entities();
    func_80138198();
    bgm_update_music_settings();
    update_ambient_sounds();
    sfx_update_looping_sound_params();
    update_windows();
    update_curtains();

    if (gOverrideFlags & GLOBAL_OVERRIDES_ENABLE_TRANSITION_STENCIL) {
        switch (D_800741A2) {
            case 0:
                gOverrideFlags |= GLOBAL_OVERRIDES_200;
                disable_player_input();

                if (D_800741A0 == 255) {
                    D_800741A2 = 1;
                    D_8009A690 = 3;
                } else {
                    D_800741A0 += 10;
                    if (D_800741A0 > 255) {
                        D_800741A0 = 255;
                    }
                }
                break;
            case 1:
                gOverrideFlags |= GLOBAL_OVERRIDES_8;
                D_8009A690--;
                if (D_8009A690 == 0) {
                    sfx_stop_env_sounds();
                    set_game_mode(GAME_MODE_STARTUP);
                    gOverrideFlags &= ~GLOBAL_OVERRIDES_ENABLE_TRANSITION_STENCIL;
                }
                break;
        }
    } else {
        D_800741A0 = 0;
        D_800741A2 = 0;
    }

    if (gOverrideFlags & GLOBAL_OVERRIDES_DISABLE_BATTLES) {
        gOverrideFlags |= GLOBAL_OVERRIDES_1000;
    } else {
        gOverrideFlags &= ~GLOBAL_OVERRIDES_1000;
    }

    if (gOverrideFlags & GLOBAL_OVERRIDES_200) {
        gOverrideFlags |= GLOBAL_OVERRIDES_2000;
    } else {
        gOverrideFlags &= ~GLOBAL_OVERRIDES_2000;
    }

    if (gOverrideFlags & GLOBAL_OVERRIDES_400) {
        gOverrideFlags |= GLOBAL_OVERRIDES_4000;
    } else {
        gOverrideFlags &= ~GLOBAL_OVERRIDES_4000;
    }

    if (gOverrideFlags & GLOBAL_OVERRIDES_800) {
        gOverrideFlags |= GLOBAL_OVERRIDES_8000;
    } else {
        gOverrideFlags &= ~GLOBAL_OVERRIDES_8000;
    }

    rand_int(1);
}
`;

export default function ExampleCodeMirror() {
    return (
        <div className="overflow-hidden [&_.cm-editor]:h-[400px]">
            <CodeMirror
                value={EXAMPLE_C_CODE}
                valueVersion={0}
                extensions={[basicSetup, cpp()]}
            />
        </div>
    );
}
