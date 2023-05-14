"use client"
import { useState } from "react"

import { ClangdStdioTransport } from "@clangd-wasm/clangd-wasm"

import LoadingSpinner from "@/components/loading.svg"
import * as settings from "@/lib/settings"

import Checkbox from "../Checkbox"
import Section from "../Section"
import SliderField from "../SliderField"

export default function EditorSettings() {
    const [autoRecompile, setAutoRecompile] = settings.useAutoRecompileSetting()
    const [autoRecompileDelay, setAutoRecompileDelay] = settings.useAutoRecompileDelaySetting()
    const [languageServerEnabled, setLanguageServerEnabled] = settings.useLanguageServerEnabled()

    const [downloadingLanguageServer, setDownloadingLanguageServer] = useState(false)

    const maybeDownloadLanguageServer = (checkboxState: boolean) => {
        setLanguageServerEnabled(checkboxState)

        if (checkboxState) {
            setDownloadingLanguageServer(true)

            // We don't need to do anything with the result of this fetch - all this
            // is is a way to make sure the wasm file ends up in the browser's cache.
            fetch(ClangdStdioTransport.getDefaultWasmURL()).then(res => res.blob()).then(() => setDownloadingLanguageServer(false))
        }
    }

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
        <Section title="Language server">
            <Checkbox
                checked={languageServerEnabled}
                onChange={maybeDownloadLanguageServer}
                label="Enable in-browser language server"
                description="Enable editor features such as code completion, error checking, and formatting via clangd and web assembly magic. WARNING: enabling will prompt a one time ~15MB download, and bump up resource usage during editing.">

                {downloadingLanguageServer && <LoadingSpinner width="24px" />}
            </Checkbox>
        </Section>
    </>
}
