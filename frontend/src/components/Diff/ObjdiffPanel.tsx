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
    compilation,
}: {
    compilation: api.Compilation | null;
}) {
    const isDark = useIsSiteThemeDark();
    const colors = getColors(useCodeColorScheme()[0]);
    const [codeFont] = useMonospaceFont();
    const [codeFontSize] = useCodeFontSize();
    const [fontLigatures] = useFontLigatures();

    const objdiffFrame = useRef<HTMLIFrameElement>(null);
    const latestCompilation = useRef<api.Compilation | null>(compilation);
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
                postState(iframeWindow, latestCompilation.current);
            }
        };
        window.addEventListener("message", listener);
        return () => {
            window.removeEventListener("message", listener);
        };
    }, [objdiffFrame.current]);

    useEffect(() => {
        latestCompilation.current = compilation;
        postState(objdiffFrame.current?.contentWindow, compilation);
    }, [compilation]);

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
        return `${process.env.OBJDIFF_BASE}?theme=${
            isDark ? "decomp-me-dark" : "decomp-me-light"
        }`;
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

const postState = (
    iframeWindow: Window | undefined,
    compilation: api.Compilation | null,
) => {
    if (
        !iframeWindow ||
        !compilation.left_object ||
        !compilation.right_object
    ) {
        return;
    }
    const leftObject = base64ToBytes(compilation.left_object);
    const rightObject = base64ToBytes(compilation.right_object);
    iframeWindow.postMessage(
        {
            type: "state",
            leftObject: leftObject.buffer,
            rightObject: rightObject.buffer,
        } as InboundMessage,
        "*",
        [leftObject.buffer, rightObject.buffer],
    );
};

function base64ToBytes(base64: string) {
    const binString = atob(base64);
    return Uint8Array.from(binString, (m) => m.codePointAt(0));
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
