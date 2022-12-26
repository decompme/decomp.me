import { headers } from "next/headers"

export function isSSR(): boolean {
    return typeof window === "undefined"
}

export function getUserAgent(): string {
    if (isSSR()) {
        return headers().get("user-agent") ?? ""
    } else {
        return navigator.userAgent
    }
}

export function isMacOS(): boolean {
    // Use User-Agent Client Hints API if supported
    // @ts-ignore
    if (!isSSR() && navigator.userAgentData) {
        // @ts-ignore
        return navigator.userAgentData.platform == "macOS"
    }

    // Fall back to user-agent sniffing
    return getUserAgent().includes("Mac OS X")
}
