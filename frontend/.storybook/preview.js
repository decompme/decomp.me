//import styles from "../src/pages/_app.scss"

import "!style-loader!css-loader!sass-loader!../src/pages/_app.scss"

export const decorators = [
    Story => {
        document.body.classList.add("themePlum")
        return <Story />
    },
]

export const parameters = {
    actions: { argTypesRegex: "^on[A-Z].*" },
    controls: {
        matchers: {
            color: /(background|color)$/i,
            date: /Date$/,
        },
    },
}
