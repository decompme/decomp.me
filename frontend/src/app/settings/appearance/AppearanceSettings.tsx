"use client"

import { cpp } from "@codemirror/lang-cpp"

import ColorSchemePicker from "../../../components/ColorSchemePicker"
import CodeMirror from "../../../components/Editor/CodeMirror"
import ThemePicker from "../../../components/ThemePicker"
import basicSetup from "../../../lib/codemirror/basic-setup"
import * as settings from "../../../lib/settings"
import Section from "../Section"
import SliderField from "../SliderField"
import TextField from "../TextField"

import styles from "./page.module.scss"

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
`

export default function AppearanceSettings() {
    const [theme, setTheme] = settings.useTheme()
    const [fontSize, setFontSize] = settings.useCodeFontSize()
    const [monospaceFont, setMonospaceFont] = settings.useMonospaceFont()
    const [codeLineHeight, setCodeLineHeight] = settings.useCodeLineHeight()
    const [codeColorScheme, setCodeColorScheme] = settings.useCodeColorScheme()

    return <>
        <Section title="Theme">
            <ThemePicker theme={theme} onChange={setTheme} />
        </Section>
        <Section title="Code">
            <div className="mb-6 flex-row gap-6 md:flex">
                <div className="mb-6 md:mb-0 md:w-1/2">
                    <SliderField label="Font size" min={8} max={24} step={1} unit="px" value={fontSize} onChange={setFontSize} />
                </div>
                <div className="md:w-1/2">
                    <SliderField label="Line height" min={0.5} max={2} step={0.05} unit="x" value={codeLineHeight} onChange={setCodeLineHeight} />
                </div>
            </div>

            <div className="mb-6 max-w-xl">
                <TextField
                    label="Font family"
                    description="The font family to use for code. The first valid comma-separated value will be used."
                    value={monospaceFont ?? ""}
                    onChange={setMonospaceFont}
                    placeholder="Menlo, Monaco, monospace"
                    inputStyle={{ fontFamily: (monospaceFont ?? "Menlo, Monaco") + ", monospace" }}
                />
            </div>

            <div className="mb-6">
                <div className="font-semibold">Color scheme</div>
                <div className="my-2 overflow-hidden rounded border border-gray-2 dark:border-gray-8">
                    <div className={styles.exampleCodeEditor}>
                        <CodeMirror
                            value={EXAMPLE_C_CODE}
                            valueVersion={0}
                            extensions={[basicSetup, cpp()]}
                        />
                    </div>
                </div>
                <ColorSchemePicker scheme={codeColorScheme} onChange={setCodeColorScheme} />
            </div>
        </Section>
    </>
}
