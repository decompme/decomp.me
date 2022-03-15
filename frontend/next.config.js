const { execSync } = require("child_process")

const { config } = require("dotenv")
const MonacoWebpackPlugin = require("monaco-editor-webpack-plugin")

for (const envFile of [".env.local", ".env"]) {
    config({ path: `../${envFile}` })
}

process.env.NEXT_PUBLIC_API_BASE = process.env.API_BASE
process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID
let git_hash
try {
    git_hash = execSync("git rev-parse HEAD").toString().trim()
} catch (error) {
    console.log("Unable to get git hash, assume running inside Docker")
    git_hash = "abc123"
}
process.env.NEXT_PUBLIC_COMMIT_HASH = git_hash

const { withPlausibleProxy } = require("next-plausible")
const withPWA = require("next-pwa")
const runtimeCaching = require("next-pwa/cache")
const removeImports = require("next-remove-imports")({
    //test: /node_modules([\s\S]*?)\.(tsx|ts|js|mjs|jsx)$/,
    //matchImports: "\\.(less|css|scss|sass|styl)$"
})
const nextTranslate = require("next-translate")

module.exports = withPlausibleProxy({
    customDomain: "https://stats.decomp.me",
})(nextTranslate(removeImports(withPWA({
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
                destination: "/settings/editor",
                permanent: false,
            },
        ]
    },
    async rewrites() {
        return []
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

                ],
            },
        ]
    },
    webpack(config) {
        config.module.rules.push({
            test: /\.svg$/,
            use: ["@svgr/webpack"],
        })

        config.plugins.push(new MonacoWebpackPlugin({
            languages: [],
            filename: "[name].worker.[contenthash].js",
        }))

        return config
    },
    images: {
        domains: ["avatars.githubusercontent.com", "cdn.discordapp.com"],
    },
    pwa: {
        dest: "public",
        runtimeCaching,
        disable: process.env.NODE_ENV === "development",
    },
    swcMinify: true,

    experimental: {},
}))))
