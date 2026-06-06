const { config } = require("dotenv");
const path = require("node:path");

for (const envFile of [".env.local", ".env"]) {
    config({ path: `../${envFile}` });
}

const getEnvBool = (key, fallback = false) => {
    const value = process.env[key];
    if (value === "false" || value === "0" || value === "off") {
        return false;
    }
    if (value === "true" || value === "1" || value === "on") {
        return true;
    }
    return fallback;
};

const mediaUrl = new URL(process.env.MEDIA_URL ?? "http://localhost");
const svgrLoader = path.join(__dirname, "loaders/svgr-webpack.js");
const publicDynamicPageCache =
    "public, s-maxage=300, stale-while-revalidate=3600";

let app = {
    async redirects() {
        return [
            {
                source: "/scratch",
                destination: "/",
                permanent: true,
            },
            {
                source: "/scratch/new",
                destination: "/new",
                permanent: true,
            },
            {
                source: "/settings",
                destination: "/settings/account",
                permanent: false,
            },
        ];
    },
    async rewrites() {
        return [];
    },
    async headers() {
        return [
            {
                source: "/(.*)", // all routes
                headers: [
                    {
                        key: "X-DNS-Prefetch-Control",
                        value: "on",
                    },
                    {
                        key: "Cross-Origin-Opener-Policy",
                        value: "same-origin",
                    },
                    {
                        key: "Cross-Origin-Embedder-Policy",
                        value: "require-corp",
                    },
                ],
            },
            {
                // cache images for 24 hours
                source: "/:all*(png|jpg|jpeg|gif|svg|ico|webp)",
                headers: [
                    {
                        key: "Cache-Control",
                        value: "public, max-age=86400, stale-while-revalidate=86400",
                    },
                ],
            },
            {
                source: "/new",
                headers: [
                    {
                        key: "Cache-Control",
                        value: publicDynamicPageCache,
                    },
                ],
            },
            {
                source: "/platform",
                headers: [
                    {
                        key: "Cache-Control",
                        value: publicDynamicPageCache,
                    },
                ],
            },
            {
                source: "/preset",
                headers: [
                    {
                        key: "Cache-Control",
                        value: publicDynamicPageCache,
                    },
                ],
            },
            {
                source: "/credits",
                headers: [
                    {
                        key: "Cache-Control",
                        value: "public, s-maxage=3600, stale-while-revalidate=86400",
                    },
                ],
            },
        ];
    },
    turbopack: {
        rules: {
            "*.svg": {
                loaders: [
                    {
                        loader: svgrLoader,
                        options: {
                            runtimeConfig: false,
                        },
                    },
                ],
                as: "*.js",
            },
        },
    },
    images: {
        remotePatterns: [
            {
                // Expected 'http' | 'https', received 'http:' at "images.remotePatterns[0].protocol"
                protocol: mediaUrl.protocol.replace(":", ""),
                hostname: mediaUrl.hostname,
                port: mediaUrl.port,
                pathname: "/**",
            },
            {
                protocol: "https",
                hostname: "avatars.githubusercontent.com",
                port: "",
                pathname: "/**",
            },
        ],
        unoptimized: !getEnvBool("FRONTEND_USE_IMAGE_PROXY"),
    },
    env: {
        // XXX: don't need 'NEXT_PUBLIC_' prefix here; we could just use 'API_BASE' and 'GITHUB_CLIENT_ID'
        // See note at top of https://nextjs.org/docs/api-reference/next.config.js/environment-variables for more information
        NEXT_PUBLIC_API_BASE: process.env.API_BASE,
        NEXT_PUBLIC_GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
        NEXT_PUBLIC_COMMIT_HASH: process.env.GIT_HASH ?? "abc123",
        OBJDIFF_BASE: process.env.OBJDIFF_BASE,
    },
};

if (process.env.ANALYZE === "true") {
    app = require("@next/bundle-analyzer")()(app);
}

const isVercel = !!process.env.VERCEL;
if (!isVercel) {
    const { withSentryConfig } = require("@sentry/nextjs");
    const sentryConfig = {
        org: "decompme",
        project: "frontend",
        silent: !process.env.CI,
        tunnelRoute: "/monitoring",
    };
    module.exports = withSentryConfig(app, sentryConfig);
} else {
    module.exports = app;
}
