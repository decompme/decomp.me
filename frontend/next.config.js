const { config } = require("dotenv");

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

const removeImports = require("next-remove-imports")({
    //test: /node_modules([\s\S]*?)\.(tsx|ts|js|mjs|jsx)$/,
    //matchImports: "\\.(less|css|scss|sass|styl)$"
});

const mediaUrl = new URL(process.env.MEDIA_URL ?? "http://localhost");

let app = removeImports({
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
        ];
    },
    webpack(config) {
        config.module.rules.push({
            test: /\.svg$/,
            use: ["@svgr/webpack"],
        });

        // @open-rpc/client-js brings in some dependencies which, in turn, have optional dependencies.
        // This confuses the heck out of webpack, so tell it should just sub in a CommonJS-style "require" statement
        // instead (which will fail and trigger the fallback at runtime)
        // https://stackoverflow.com/questions/58697934/webpack-how-do-you-require-an-optional-dependency-in-bundle-saslprep
        config.externals.push({
            encoding: "commonjs encoding",
            bufferutil: "commonjs bufferutil",
            "utf-8-validate": "commonjs utf-8-validate",
        });

        // All of the vscode-* packages (jsonrpc, languageserver-protocol, etc.) are distributed as UMD modules.
        // This also leaves webpack with no idea how to handle require statements.
        // umd-compat-loader strips away the header UMD adds to allow browsers to parse ES modules
        // and just treats the importee as an ES module.
        config.module.rules.push({
            test: /node_modules[\\|/](vscode-.*)/,
            use: {
                loader: "umd-compat-loader",
            },
        });

        return config;
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
});

if (process.env.ANALYZE === "true") {
    app = require("@next/bundle-analyzer")(app);
}

const isVercel = !!process.env.VERCEL;
if (!isVercel) {
    const { withSentryConfig } = require("@sentry/nextjs");
    const sentryConfig = {
        org: "decompme",
        project: "frontend",
        silent: !process.env.CI,
        tunnelRoute: "/monitoring",
        disableLogger: true,
    };
    module.exports = withSentryConfig(app, sentryConfig);
} else {
    module.exports = app;
}
