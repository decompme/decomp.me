import { Preset } from "./types"

export function presetUrl(preset: Preset): string {
    return `/preset/${preset.id}`
}
