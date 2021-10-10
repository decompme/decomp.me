const { config } = require("dotenv")

for (const envFile of [".env.local", ".env"]) {
    config({ path: `../${envFile}` })
}

module.exports = {
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
}
