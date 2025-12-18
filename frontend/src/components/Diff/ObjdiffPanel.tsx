import type * as api from "@/lib/api";
import { getColors } from "@/lib/codemirror/color-scheme";
import {
    useCodeColorScheme,
    useCodeFontSize,
    useFontLigatures,
    useIsSiteThemeDark,
    useMonospaceFont,
} from "@/lib/settings";
import { useEffect, useMemo, useRef } from "react";

export default function ObjdiffPanel({
    scratch,
    compilation,
    buildRunning,
}: {
    scratch: Readonly<api.Scratch>;
    compilation: api.Compilation | null;
    buildRunning: boolean;
}) {
    const isDark = useIsSiteThemeDark();
    const colors = getColors(useCodeColorScheme()[0]);
    const [codeFont] = useMonospaceFont();
    const [codeFontSize] = useCodeFontSize();
    const [fontLigatures] = useFontLigatures();

    const objdiffFrame = useRef<HTMLIFrameElement>(null);
    const latestScratch = useRef<api.Scratch>(scratch);
    const latestCompilation = useRef<api.Compilation | null>(compilation);
    const latestBuildRunning = useRef(buildRunning);
    const latestIsDark = useRef(isDark);
    const latestColors = useRef(colors);
    const latestCodeFont = useRef(codeFont);
    const latestCodeFontSize = useRef(codeFontSize);
    const latestFontLigatures = useRef(fontLigatures);

    useEffect(() => {
        const iframeWindow = objdiffFrame.current?.contentWindow;
        if (!iframeWindow) {
            return;
        }
        const listener = (event: MessageEvent) => {
            if (event.source !== iframeWindow) {
                return;
            }
            const message = event.data as OutboundMessage;
            if (message.type === "ready") {
                iframeWindow.postMessage(
                    {
                        type: "theme",
                        isDark: latestIsDark.current,
                        colors: latestColors.current,
                        codeFont: latestCodeFont.current,
                        codeFontSize: latestCodeFontSize.current,
                        fontLigatures: latestFontLigatures.current,
                    } as InboundMessage,
                    "*",
                );
                postState(
                    iframeWindow,
                    latestCompilation.current,
                    latestBuildRunning.current,
                    latestScratch.current,
                );
            }
        };
        window.addEventListener("message", listener);
        return () => {
            window.removeEventListener("message", listener);
        };
    }, [objdiffFrame.current]);

    useEffect(() => {
        latestCompilation.current = compilation;
        postState(
            objdiffFrame.current?.contentWindow,
            compilation,
            latestBuildRunning.current,
            latestScratch.current,
        );
    }, [compilation]);

    useEffect(() => {
        latestBuildRunning.current = buildRunning;
        postBuildRunning(objdiffFrame.current?.contentWindow, buildRunning);
    }, [buildRunning]);

    useEffect(() => {
        latestScratch.current = scratch;
        postScratchInfo(objdiffFrame.current?.contentWindow, scratch);
    }, [scratch]);

    useEffect(() => {
        latestIsDark.current = isDark;
        latestColors.current = colors;
        const iframeWindow = objdiffFrame.current?.contentWindow;
        if (!iframeWindow) {
            return;
        }
        iframeWindow.postMessage(
            {
                type: "theme",
                isDark,
                colors,
                codeFont,
                codeFontSize,
                fontLigatures,
            } as InboundMessage,
            "*",
        );
    }, [objdiffFrame.current, isDark, colors, codeFont, codeFontSize]);

    const url = useMemo(() => {
        const url = new URL(process.env.OBJDIFF_BASE, window.location.href);
        url.searchParams.set(
            "theme",
            isDark ? "decomp-me-dark" : "decomp-me-light",
        );
        return url.toString();
    }, []);

    return (
        <div className="size-full">
            <iframe
                ref={objdiffFrame}
                src={url}
                title="objdiff"
                style={{ width: "100%", height: "100%" }}
                allow="clipboard-write"
            />
        </div>
    );
}

const postBuildRunning = (
    iframeWindow: Window | null | undefined,
    buildRunning: boolean,
) => {
    if (!iframeWindow) {
        return;
    }
    const message: InboundMessage = {
        type: "state",
        buildRunning,
    };
    iframeWindow.postMessage(message, "*");
};

const postScratchInfo = (
    iframeWindow: Window | null | undefined,
    scratch: Readonly<api.Scratch>,
) => {
    if (!iframeWindow) {
        return;
    }
    const message: InboundMessage = {
        type: "state",
        diffLabel: scratch.diff_label || null,
    };
    iframeWindow.postMessage(message, "*");
};

const postState = (
    iframeWindow: Window | null | undefined,
    compilation: api.Compilation | null,
    buildRunning: boolean,
    scratch: Readonly<api.Scratch>,
) => {
    if (!iframeWindow || !compilation) {
        return;
    }
    const leftObject = base64ToBytes(compilation.left_object);
    const rightObject = base64ToBytes(compilation.right_object);
    const message: InboundMessage = {
        type: "state",
        buildRunning,
        leftStatus: {
            success: true,
            cmdline: null,
            stdout: null,
            stderr: null,
        },
        rightStatus: {
            success: compilation.success,
            cmdline: null,
            stdout: compilation.compiler_output,
            stderr: null,
        },
        leftObject: leftObject?.buffer,
        rightObject: rightObject?.buffer,
        diffLabel: scratch.diff_label || null,
    };
    iframeWindow.postMessage(
        message,
        "*",
        [leftObject?.buffer, rightObject?.buffer].filter(
            (b) => b != null,
        ) as ArrayBuffer[],
    );
};

function base64ToBytes(base64: string) {
    if (!base64) {
        return null;
    }
    const binString = atob(base64);
    return Uint8Array.from(binString, (m) => m.codePointAt(0) as number);
}

type ConfigPropertyValue = boolean | string;

type ConfigProperties = Record<string, ConfigPropertyValue>;

type BuildStatus = {
    success: boolean;
    cmdline: string;
    stdout: string;
    stderr: string;
};

type StateMessage = {
    type: "state";
    buildRunning?: boolean;
    configProperties?: ConfigProperties;
    leftStatus?: BuildStatus | null;
    rightStatus?: BuildStatus | null;
    leftObject?: ArrayBuffer | null;
    rightObject?: ArrayBuffer | null;
    diffLabel?: string | null;
};

type Colors = {
    background: string;
};

type ThemeMessage = {
    type: "theme";
    isDark: boolean;
    colors: Colors;
    codeFont?: string;
    codeFontSize?: number;
};

// host -> webview
type InboundMessage = ThemeMessage | StateMessage;

type ReadyMessage = {
    type: "ready";
};

type SetConfigPropertyMessage = {
    type: "setConfigProperty";
    id: string;
    value: ConfigPropertyValue | undefined;
};

// webview -> host
type OutboundMessage = ReadyMessage | SetConfigPropertyMessage;
