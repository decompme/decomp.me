const { config } = require("dotenv")

for (const envFile of [".env.local", ".env"]) {
    config({ path: `../${envFile}` })
}

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
    images: {
        domains: ["avatars.githubusercontent.com"],
    },
    pwa: {
        dest: "public",
        runtimeCaching,
        disable: process.env.NODE_ENV === "development",
    },
})
