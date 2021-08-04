import { config } from "dotenv"

config()

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
    },
    optimize: {
        preload: true,
        minify: true,
        target: "es2019",
        treeshake: true,
        sourcemap: "external",
    },
}
