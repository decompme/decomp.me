export function isServer(): boolean {
    return typeof window === "undefined";
}

export function getUserAgent(): string {
    if (isServer()) {
        // TODO - fix this
        throw Error("getUserAgent() called on server");
    } else {
        return navigator.userAgent;
    }
}

export function isMacOS(): boolean {
    // Use User-Agent Client Hints API if supported
    // @ts-ignore
    if (!isServer() && navigator.userAgentData) {
        // @ts-ignore
        return navigator.userAgentData.platform === "macOS";
    }

    // Fall back to user-agent sniffing
    return getUserAgent().includes("Mac OS X");
}
