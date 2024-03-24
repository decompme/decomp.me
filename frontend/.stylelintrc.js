module.exports = {
    "extends": [
        "stylelint-config-standard-scss",
        "stylelint-config-css-modules"
    ],
    "rules": {
        "declaration-empty-line-before": null,
        "at-rule-no-unknown": null,
        "no-descending-specificity": null,
        "selector-class-pattern": null,
        "selector-id-pattern": null,
        "selector-no-vendor-prefix": null,
        "selector-pseudo-element-no-unknown": null,
        "color-function-notation": null,
        "alpha-value-notation": null,
        "shorthand-property-no-redundant-values": null,
        "property-no-vendor-prefix": null,
        "declaration-block-no-redundant-longhand-properties": null,
        "scss/at-rule-no-unknown": [
            true,
            {
                ignoreAtRules: [
                    "tailwind",
                    "apply",
                    "variants",
                    "responsive",
                    "screen",
                ],
            }
        ],
    },
    "overrides": [
        {
            "files": ["**/*.scss"],
            "customSyntax": require("postcss-scss"),
        }
    ]
}
