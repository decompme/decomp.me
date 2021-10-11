import { config } from "dotenv"

for (const envFile of [".env.local", ".env"]) {
    config({ path: `../${envFile}` })
}

/** @type {import("snowpack").SnowpackUserConfig } */
export default {
    env: {
        DEBUG: process.env.DEBUG == "on",
        API_BASE: process.env.API_BASE,
        GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
    },
    mount: {
        public: { url: "/", static: true },
        src: { url: "/dist" },
    },
    plugins: [
        "@prefresh/snowpack",
        "@snowpack/plugin-postcss",
    ],
    routes: [
        /* Route everything to index.html */
        { match: "routes", src: ".*", dest: "/index.html" },
    ],
    alias: {
        "react": "preact/compat",
        "react-dom": "preact/compat",
    },
    devOptions: {
        open: "none",
    }
}
