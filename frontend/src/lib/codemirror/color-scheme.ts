import isDarkColor from "is-dark-color";

export const COLOR_NAMES = {
    background: "Background",
    foreground: "Foreground",
    cursor: "Cursor",

    comment: "Comment",
    variable: "Variable",
    punctuation: "Punctuation",

    keyword: "Keyword",
    preprocessor: "Preprocessor",
    function: "Function",

    operator: "Operator",
    number: "Number",
    bool: "Boolean",

    string: "String",
    character: "Character",
    type: "Type name",
};

export type Colors = Record<keyof typeof COLOR_NAMES, string>;

export const COLOR_SCHEME_PRESETS = {
    "Frog Dark": {
        background: "#161618", // .dark .bg-gray-1
        cursor: "#ffffff",
        foreground: "#647a97",
        keyword: "#cf5dff",
        variable: "#8599b3",
        type: "#45b8ff",
        function: "#ff4a98",
        punctuation: "#656f7e",
        operator: "#7f83ff",
        comment: "#465173",
        number: "#0afafa",
        bool: "#f248bc",
        string: "#face0a",
        character: "#cefa0a",
        preprocessor: "#3bff6c",
    },
    Material: {
        background: "#282c34",
        cursor: "#ffffff",
        foreground: "#abb2bf",
        keyword: "#d479f2",
        variable: "#f29161",
        type: "#f2c261",
        function: "#61b6f2",
        punctuation: "#abb2bf",
        operator: "#abb2bf",
        comment: "#81858D",
        number: "#ff5370",
        bool: "#ff5370",
        string: "#5ce55c",
        character: "#d479f2",
        preprocessor: "#d479f2",
    },
    Dracula: {
        background: "#282A36",
        cursor: "#f8f8f2",
        foreground: "#f8f8f2",
        keyword: "#d880ff",
        variable: "#dcd8ff",
        type: "#8be9fd",
        function: "#50fa7b",
        punctuation: "#f8f8f2",
        operator: "#f8f8f2",
        comment: "#6272a4",
        number: "#bd93f9",
        bool: "#ff79c6",
        string: "#f1fa8c",
        character: "#f1fa8c",
        preprocessor: "#ff79c6",
    },
    "Frog Light": {
        background: "#fdfcfd", // .bg-gray-1
        cursor: "#000000",
        foreground: "#647a97",
        keyword: "#b12fe9",
        variable: "#5d6d80",
        type: "#009dff",
        function: "#ff006f",
        punctuation: "#656f7e",
        operator: "#7f83ff",
        comment: "#878fa9",
        number: "#00b2d6",
        bool: "#f248bc",
        string: "#deba1d",
        character: "#9ec200",
        preprocessor: "#2fcd56",
    },
};

export type ColorPresetName = keyof typeof COLOR_SCHEME_PRESETS;

export type ColorScheme = ColorPresetName | Colors;

export const DARK_THEMES: ColorPresetName[] = [
    "Frog Dark",
    "Material",
    "Dracula",
];

export const LIGHT_THEMES: ColorPresetName[] = ["Frog Light"];

export function getColors(scheme: ColorScheme): Colors {
    if (typeof scheme === "string") {
        return (
            COLOR_SCHEME_PRESETS[scheme] ?? COLOR_SCHEME_PRESETS["Frog Dark"]
        );
    } else {
        return scheme;
    }
}

export function applyColorScheme(scheme: ColorScheme) {
    const colors = getColors(scheme);

    for (const [key, value] of Object.entries(colors)) {
        document.body.style.setProperty(`--code-${key}`, value.toString());
    }

    let isDark = true;
    try {
        isDark = isDarkColor(colors.background);
    } catch (error) {
        // Ignore; color is being edited
    }

    if (isDark) {
        document.body.style.setProperty("--code-selection", "#ffffff22");
        document.body.style.setProperty("--code-highlight", "#ffffff05");
        // Indentation marker colors for dark theme
        document.body.style.setProperty("--indent-marker-bg-color", `color-mix(in srgb, ${colors.foreground}, transparent 60%)`);
        document.body.style.setProperty("--indent-marker-active-bg-color", `color-mix(in srgb, ${colors.foreground}, transparent 40%)`);
    } else {
        document.body.style.setProperty("--code-selection", "#00000022");
        document.body.style.setProperty("--code-highlight", "#00000005");
        // Indentation marker colors for light theme
        document.body.style.setProperty("--indent-marker-bg-color", `color-mix(in srgb, ${colors.foreground}, transparent 60%)`);
        document.body.style.setProperty("--indent-marker-active-bg-color", `color-mix(in srgb, ${colors.foreground}, transparent 40%)`);
    }
}

export default COLOR_SCHEME_PRESETS;
