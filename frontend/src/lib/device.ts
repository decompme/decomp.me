import { headers } from "next/headers"

export function isServer(): boolean {
    return typeof window === "undefined"
}

export function getUserAgent(): string {
    if (isServer()) {
        try {
            return headers().get("user-agent")
        } catch (error) {
            console.warn("Failed to get user-agent from headers:", error)
            return ""
        }
    } else {
        return navigator.userAgent
    }
}

export function isMacOS(): boolean {
    // Use User-Agent Client Hints API if supported
    // @ts-ignore
    if (!isServer() && navigator.userAgentData) {
        // @ts-ignore
        return navigator.userAgentData.platform == "macOS"
    }

    // Fall back to user-agent sniffing
    return getUserAgent().includes("Mac OS X")
}
