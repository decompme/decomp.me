import { config } from "dotenv"

config({ path: "../.env" })

/** @type {import("snowpack").SnowpackUserConfig } */
export default {
    env: {
        API_BASE: process.env.API_BASE,
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
        react: "preact/compat",
        "react-dom": "preact/compat",
    },
}
