import Document, { Html, Head, Main, NextScript } from "next/document"

export default class MyDocument extends Document {
    render() {
        return (
            <Html lang="en">
                <Head>
                    <meta charSet="utf-8" />

                    <link rel="manifest" href="/manifest.json" />

                    <link rel="shortcut icon" href="/purplefrog.svg" />
                    <link rel="apple-touch-icon" href="/purplefrog-bg.svg" />
                </Head>
                <body className="theme-auto">
                    <Main />
                    <NextScript />
                </body>
            </Html>
        )
    }
}
