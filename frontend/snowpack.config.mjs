/** @type {import("snowpack").SnowpackUserConfig } */
export default {
    mount: {
        public: { url: "/", static: true },
        src: { url: "/dist" },
    },
    plugins: [
        "@prefresh/snowpack",
    ],
    routes: [
        /* Route everything to index.html */
        { match: "routes", src: ".*", dest: "/index.html" },
    ],
    alias: {
        react: "preact/compat",
    },
    /*optimize: {
        bundle: true,
        minify: true,
        target: "es2019",
        treeshake: true,
        sourcemap: "external",
    },*/
}
