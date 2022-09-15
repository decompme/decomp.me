import { ChangeEvent, useEffect, useState } from "react"

import { useRouter } from "next/router"

import { cpp } from "@codemirror/lang-cpp"
import { FileIcon, PaintbrushIcon } from "@primer/octicons-react"
import classNames from "classnames"

import ColorSchemePicker from "../../components/ColorSchemePicker"
import CodeMirror from "../../components/Editor/CodeMirror"
import Footer from "../../components/Footer"
import Nav from "../../components/Nav"
import NumberInput from "../../components/NumberInput"
import PageTitle from "../../components/PageTitle"
import Tabs, { Tab } from "../../components/Tabs"
import ThemePicker from "../../components/ThemePicker"
import basicSetup from "../../lib/codemirror/basic-setup"
import * as settings from "../../lib/settings"

import styles from "./[tab].module.scss"

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

function useIsMounted() {
    const [isMounted, setIsMounted] = useState(false)
    useEffect(() => setIsMounted(true), [])
    return isMounted
}

function AppearanceSettings() {
    const [theme, setTheme] = settings.useTheme()
    const [fontSize, setFontSize] = settings.useCodeFontSize()
    const [monospaceFont, setMonospaceFont] = settings.useMonospaceFont()
    const [codeLineHeight, setCodeLineHeight] = settings.useCodeLineHeight()
    const [codeColorScheme, setCodeColorScheme] = settings.useCodeColorScheme()

    return <>
        <section>
            <h2>Site theme</h2>
            <ThemePicker theme={theme} onChange={setTheme} />
        </section>
        <section>
            <h2>Code editor</h2>
            <div className={styles.col2}>
                <div>
                    <label htmlFor="fontSize">Font size</label>
                    <div className={styles.rangeInputPair}>
                        <input
                            id="fontSize"
                            type="range"
                            min="8" max="24" step="1" value={fontSize ?? "12"}
                            onChange={(evt: ChangeEvent<HTMLInputElement>) => setFontSize(+evt.target.value)}
                        />
                        <div>
                            <NumberInput value={fontSize ?? 12} onChange={setFontSize}/>px
                        </div>
                    </div>

                    <label htmlFor="monospaceFont">Font family</label>
                    <input
                        id="monospaceFont"
                        type="text"
                        value={monospaceFont ?? ""}
                        onChange={(evt: ChangeEvent<HTMLInputElement>) => setMonospaceFont(evt.target.value)}
                        placeholder="Menlo, Monaco, monospace"
                    />

                    <label htmlFor="codeLineHeight">Line height</label>
                    <div className={styles.rangeInputPair}>
                        <input
                            id="codeLineHeight"
                            type="range"
                            min="0.5" max="2" step="0.05" value={codeLineHeight}
                            onChange={(evt: ChangeEvent<HTMLInputElement>) => setCodeLineHeight(+evt.target.value)}
                        />
                        <div>
                            <NumberInput
                                value={codeLineHeight}
                                onChange={setCodeLineHeight}
                                stringValue={codeLineHeight.toFixed(2)}
                            />
                        </div>
                    </div>

                    <label>Color scheme</label>
                    <ColorSchemePicker scheme={codeColorScheme} onChange={setCodeColorScheme} />
                </div>
                <div className={styles.exampleCodeEditor}>
                    <CodeMirror
                        value={EXAMPLE_C_CODE}
                        extensions={[basicSetup, cpp()]}
                    />
                </div>
            </div>
        </section>
    </>
}

function ScratchEditorSettings() {
    const [autoRecompile, setAutoRecompile] = settings.useAutoRecompileSetting()
    const [autoRecompileDelay, setAutoRecompileDelay] = settings.useAutoRecompileDelaySetting()
    const [compareAgainstParentScratch, setCompareAgainstParentScratch] = settings.useCompareAgainstParentScratch()

    const minDelay = 50
    const onChange = (duration: number) => setAutoRecompileDelay(Math.max(minDelay, duration))

    return <>
        <section>
            <h2>Automatic compilation</h2>
            <p>
                When enabled, the editor will automatically recompile your code
                a short period of time after you stop typing.
            </p>
            <label className={styles.booleanPreference}>
                <input
                    type="checkbox"
                    checked={autoRecompile}
                    onChange={evt => setAutoRecompile(evt.target.checked)}
                />
                Automatically compile after typing
            </label>
            <div className={classNames(styles.intPreference, { [styles.disabled]: !autoRecompile })}>
                <input
                    type="range"
                    min={minDelay} max="2000" step="50" value={autoRecompileDelay}
                    onChange={(evt: ChangeEvent<HTMLInputElement>) => onChange(+evt.target.value)}
                    disabled={!autoRecompile}
                />
                <NumberInput value={autoRecompileDelay} onChange={onChange} disabled={!autoRecompile}/>ms
                delay before recompile is triggered
            </div>
        </section>
        <section>
            <h2>Compare forks against their parent</h2>
            <p>
                When enabled, code changes that have been made to a fork will be highlighted.
            </p>
            <label className={styles.booleanPreference}>
                <input
                    type="checkbox"
                    checked={compareAgainstParentScratch}
                    onChange={evt => setCompareAgainstParentScratch(evt.target.checked)}
                />
                Highlight lines that have changed
            </label>
        </section>
    </>
}

export default function SettingsPage() {
    const router = useRouter()
    const { tab } = router.query as { tab: string }
    const isMounted = useIsMounted()

    const ContentEl = {
        appearance: AppearanceSettings,
        editor: ScratchEditorSettings,
    }[tab]

    return <>
        <PageTitle title="Settings" />
        <Nav />
        <main>
            <div className={styles.container}>
                <aside>
                    <h1>Settings</h1>
                    <Tabs
                        activeTab={tab}
                        onChange={tab => router.push(`/settings/${tab}`, undefined, { shallow: true })}
                        className={styles.tabs}
                        vertical
                        border={false}
                    >
                        <Tab key="appearance" tabKey="appearance" label={<><PaintbrushIcon /> Appearance</>} />
                        <Tab key="editor" tabKey="editor" label={<><FileIcon /> Scratch editor</>} />
                    </Tabs>
                </aside>
                <div className={styles.content}>
                    {ContentEl && isMounted && <ContentEl />}
                </div>
            </div>
        </main>
        <Footer />
    </>
}
