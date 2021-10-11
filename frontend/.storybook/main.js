const path = require("path")
const { config } = require("dotenv")
const { execSync } = require("child_process")

for (const envFile of [".env.local", ".env"]) {
    config({ path: `../${envFile}` })
}

process.env.STORYBOOK_API_BASE = process.env.API_BASE
process.env.STORYBOOK_GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID
process.env.STORYBOOK_COMMIT_HASH = execSync("git rev-parse HEAD").toString().trim()

module.exports = {
    stories: [
        "../src/**/*.stories.mdx",
        "../src/**/*.stories.@(js|jsx|ts|tsx)",
    ],
    addons: [
        "@storybook/addon-links",
        "@storybook/addon-essentials",
        "@storybook/addon-viewport",
        "storybook-dark-mode",
    ],
    core: {
        builder: "webpack5",
    },
    webpackFinal: async (config, { configType }) => {
        // `configType` has a value of 'DEVELOPMENT' or 'PRODUCTION'
        // You can change the configuration based on that.
        // 'PRODUCTION' is used when building the static version of storybook.

        // load svg as element
        const fileLoaderRule = config.module.rules.find(rule => rule.test && rule.test.test('.svg'));
        fileLoaderRule.exclude = /\.svg$/
        config.module.rules.push({
            test: /\.svg$/,
            use: ["@svgr/webpack"],
        })

        // run postcss on scss
        config.module.rules.push({
            test: /\.scss$/,
            use: [
                'style-loader', {
                    loader: 'css-loader',
                    options: {
                        importLoaders: 2,
                    },
                },
                'postcss-loader',
                'sass-loader',
            ],
            include: path.resolve(__dirname, '../src'),
        })

        return config
    },
}
