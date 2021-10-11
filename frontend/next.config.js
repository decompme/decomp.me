const { config } = require("dotenv")

for (const envFile of [".env.local", ".env"]) {
    config({ path: `../${envFile}` })
}

process.env.NEXT_PUBLIC_API_BASE = process.env.API_BASE
process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID

const withPWA = require('next-pwa')
const runtimeCaching = require('next-pwa/cache')

module.exports = withPWA({
    async redirects() {
        return [
            {
                source: "/",
                destination: "/scratch",
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
                        value: "on"
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

        return config
    },
    images: {
        domains: ["avatars.githubusercontent.com"],
    },
    pwa: {
        dest: "public",
        runtimeCaching,
        disable: process.env.NODE_ENV === "development",
    },
})
