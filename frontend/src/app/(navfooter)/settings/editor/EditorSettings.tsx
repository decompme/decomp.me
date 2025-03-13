"use client";
import { useEffect, useRef, useState } from "react";

import LoadingSpinner from "@/components/loading.svg";
import {
    ThreeWayDiffBase,
    useAutoRecompileSetting,
    useAutoRecompileDelaySetting,
    useMatchProgressBarEnabled,
    useLanguageServerEnabled,
    useVimModeEnabled,
    useThreeWayDiffBase,
    useObjdiffClientEnabled,
} from "@/lib/settings";

import Checkbox from "../Checkbox";
import RadioList from "../RadioList";
import Section from "../Section";
import SliderField from "../SliderField";

export default function EditorSettings() {
    const [autoRecompile, setAutoRecompile] = useAutoRecompileSetting();
    const [autoRecompileDelay, setAutoRecompileDelay] =
        useAutoRecompileDelaySetting();
    const [matchProgressBarEnabled, setMatchProgressBarEnabled] =
        useMatchProgressBarEnabled();
    const [languageServerEnabled, setLanguageServerEnabled] =
        useLanguageServerEnabled();
    const [vimModeEnabled, setVimModeEnabled] = useVimModeEnabled();
    const [threeWayDiffBase, setThreeWayDiffBase] = useThreeWayDiffBase();
    const [objdiffClientEnabled, setObjdiffClientEnabled] =
        useObjdiffClientEnabled();

    const [downloadingLanguageServer, setDownloadingLanguageServer] =
        useState(false);

    const isInitialMount = useRef(true);

    useEffect(() => {
        // Prevent the language server binary from being downloaded if the user has it enabled, then enters settings
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }

        if (languageServerEnabled) {
            setDownloadingLanguageServer(true);

            import("@clangd-wasm/clangd-wasm").then(
                ({ ClangdStdioTransport }) => {
                    // We don't need to do anything with the result of this fetch - all this
                    // is is a way to make sure the wasm file ends up in the browser's cache.
                    fetch(ClangdStdioTransport.getDefaultWasmURL(false))
                        .then((res) => res.blob())
                        .then(() => setDownloadingLanguageServer(false));
                },
            );
        }
    }, [languageServerEnabled]);

    const threeWayDiffOptions = {
        [ThreeWayDiffBase.SAVED]: {
            label: (
                <div>
                    Latest save ({" "}
                    <span className="font-mono text-gray-11">diff.py -b</span> )
                </div>
            ),
        },
        [ThreeWayDiffBase.PREV]: {
            label: (
                <div>
                    Previous result ({" "}
                    <span className="font-mono text-gray-11">diff.py -3</span> )
                </div>
            ),
        },
    };

    return (
        <>
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
            <Section title="Three-way diffing target">
                <div className="text-gray-11">
                    When enabling three-way diffing for a scratch, let the third
                    column show a diff against:
                </div>
                <RadioList
                    value={threeWayDiffBase}
                    onChange={(value: string) => {
                        setThreeWayDiffBase(value as ThreeWayDiffBase);
                    }}
                    options={threeWayDiffOptions}
                />
            </Section>
            <Section title="Match progress bar">
                <Checkbox
                    checked={matchProgressBarEnabled}
                    onChange={setMatchProgressBarEnabled}
                    label="Show progress bar on scratch editor"
                    description="Show a progress bar at the top of the editor to visually display the match percent of a scratch."
                />
            </Section>
            <Section title="Language server">
                <Checkbox
                    checked={languageServerEnabled}
                    onChange={setLanguageServerEnabled}
                    label="Enable language server"
                    description="Enable editor features such as code completion, error checking, and formatting via clangd and WebAssembly magic. WARNING: enabling will incur a one time ~13MB download, and bump up resource usage during editing."
                >
                    {downloadingLanguageServer && (
                        <div className="flex gap-2 p-4">
                            <LoadingSpinner width="24px" /> Downloading...
                        </div>
                    )}
                </Checkbox>
            </Section>
            <Section title="Vim Mode">
                <Checkbox
                    checked={vimModeEnabled}
                    onChange={setVimModeEnabled}
                    label="Enable vim bindings"
                    description="Enable vim bindings in the scratch editor"
                />
            </Section>
            <Section title="Experiments">
                <Checkbox
                    checked={objdiffClientEnabled}
                    onChange={setObjdiffClientEnabled}
                    label="Enable objdiff integration [alpha]"
                    description="Enable objdiff tab in the scratch editor. Still under development."
                />
            </Section>
        </>
    );
}
