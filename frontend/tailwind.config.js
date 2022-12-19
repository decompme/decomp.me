/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: "class",
    content: [
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {},
        colors: Object.assign(require("tailwindcss-open-color"), {
            "gray-10": "#1c1c1c",
        })
    },
    plugins: [],
}
