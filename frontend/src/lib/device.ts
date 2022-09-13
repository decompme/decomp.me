export function isMacOS(): boolean {
    if (typeof window === "undefined") {
        // SSR
        return false
    }

    // Use User-Agent Client Hints API if supported
    // @ts-ignore
    if (navigator.userAgentData) {
        // @ts-ignore
        return navigator.userAgentData.platform == "macOS"
    }

    // Fall back to user-agent sniffing
    return navigator.userAgent.includes("Mac OS X")
}
