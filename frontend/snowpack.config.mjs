import { config } from "dotenv"

for (const envFile of [".env", "local.env", "frontend.env"]) {
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
        "@snowpack/plugin-react-refresh",
        "@snowpack/plugin-postcss",
    ],
    routes: [
        /* Route everything to index.html */
        { match: "routes", src: ".*", dest: "/index.html" },
    ],
    devOptions: {
        open: "none",
    }
}
