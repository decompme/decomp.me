"use client"

import dynamic from "next/dynamic"

import ColorSchemePicker from "@/components/ColorSchemePicker"
import LoadingSpinner from "@/components/loading.svg"
import ThemePicker from "@/components/ThemePicker"
import * as settings from "@/lib/settings"

import Section from "../Section"
import SliderField from "../SliderField"
import TextField from "../TextField"

const DynamicExampleCodeMirror = dynamic(() => import("./ExampleCodeMirror"), {
    loading: () => <div className="flex animate-pulse items-center justify-center" style={{ height: "200px" }}>
        <LoadingSpinner className="h-16 w-16 opacity-50" />
    </div>,
})

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
                <div className="my-2 overflow-hidden rounded border border-gray-6">
                    <DynamicExampleCodeMirror />
                </div>
                <ColorSchemePicker scheme={codeColorScheme} onChange={setCodeColorScheme} />
            </div>
        </Section>
    </>
}
