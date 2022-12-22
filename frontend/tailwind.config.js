const plugin = require("tailwindcss/plugin")
const radixColors = require("@radix-ui/colors")

// Colors to use from Radix UI
const COLOR_NAME_MAP = {
    gray: "mauve", // It's "grey", but whatever
    purple: "purple",
    red: "red",
    blue: "blue",
}

// Convert color from `hsl(h, s, l)` to `h s l` for Tailwind
function extractHslComponents(color) {
    if (!color.startsWith("hsl(")) {
        console.warn(`color ${color} is not in hsl format`)
    }

    return color
        .replace(/,/g, "")
        .replace("hsl(", "")
        .replace(")", "")
}

function makeTailwindColor(colorName) {
    const obj = {}

    for (let i = 1; i <= 12; i++) {
        const key = `${colorName}${i}`
        obj[i] = `hsl(var(--color-${key}) / <alpha-value>)`
    }

    return obj
}

function makeCssVariables(suffix = "") {
    return Object.keys(COLOR_NAME_MAP).reduce((acc, unmappedColorName) => {
        const colorName = COLOR_NAME_MAP[unmappedColorName]
        const colors = radixColors[colorName + suffix]
        const obj = {}

        for (let i = 1; i <= 12; i++) {
            const key = `${colorName}${i}`
            const color = extractHslComponents(colors[key])
            obj[`--color-${key}`] = color
        }

        return { ...acc, ...obj }
    }, {})
}

/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: "class",
    content: [
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {},
        colors: {
            // Subset of Tailwind default colors
            transparent: "transparent",
            current: "currentColor",

            // Make colors from Radix UI available
            ...Object.keys(COLOR_NAME_MAP).reduce((acc, unmappedColorName) => {
                const radixColor = COLOR_NAME_MAP[unmappedColorName]
                acc[unmappedColorName] = makeTailwindColor(radixColor)
                return acc
            }, {}),
        },
    },
    plugins: [
        // Set --color-* variables
        plugin(({ addBase }) => {
            addBase({
                ":root": makeCssVariables(),
                ".dark": makeCssVariables("Dark"),
            })
        }),
    ],
}
