module.exports = {
    "parser": "@typescript-eslint/parser",
    "plugins": [
        "@typescript-eslint",
    ],
    "extends": [
        "eslint:recommended",
        "react",
        "plugin:@typescript-eslint/eslint-recommended",
        "plugin:@typescript-eslint/recommended",
    ],
    "rules": {
        "semi": ["error", "never", { "beforeStatementContinuationChars": "always" }],
        "indent": ["error", 4],
        "quotes": ["error", "double"],
        "quote-props": ["error", "consistent"],
        "brace-style": "error",
        "object-curly-spacing": ["error", "always"],
        "array-bracket-spacing": ["error", "never"],
        "no-else-return": "off",
        "no-trailing-spaces": "error",
        "prefer-const": ["warn", { destructuring: "all" }],
        "arrow-parens": ["error", "as-needed"],
        "no-confusing-arrow": ["error", { allowParens: true }],
        "@typescript-eslint/explicit-module-boundary-types": "off",
        "@typescript-eslint/ban-ts-comment": "off",
        "react/no-danger": "off",
    },
}
