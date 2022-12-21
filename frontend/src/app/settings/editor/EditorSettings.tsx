"use client"

import * as settings from "../../../lib/settings"
import Checkbox from "../Checkbox"
import Section from "../Section"
import SliderField from "../SliderField"

export default function EditorSettings() {
    const [autoRecompile, setAutoRecompile] = settings.useAutoRecompileSetting()
    const [autoRecompileDelay, setAutoRecompileDelay] = settings.useAutoRecompileDelaySetting()

    return <>
        <Section title="Automatic compilation">
            <Checkbox
                checked={autoRecompile}
                onChange={setAutoRecompile}
                label="Automatically compile after changes to scratch"
                description="Automatically recompile your code a short period of time after you stop typing."
            >
                <div className="max-w-prose text-sm">
                    <SliderField
                        value={autoRecompileDelay}
                        onChange={setAutoRecompileDelay}
                        disabled={!autoRecompile}
                        label="Delay before recompile is triggered"
                        unit="ms"
                        min={100}
                        max={2000}
                        step={50}
                    />
                </div>
            </Checkbox>
        </Section>
    </>
}
