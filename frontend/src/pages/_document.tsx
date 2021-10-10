import Document, { Html, Head, Main, NextScript } from "next/document"

export default class MyDocument extends Document {
    render() {
        return (
            <Html lang="en">
                <Head>
                    <meta charSet="utf-8" />
                    <meta name="description" content="Decompile code in the browser" />

                    <link rel="manifest" href="/manifest.json" />

                    <link rel="shortcut icon" type="image/png" href="/frog.png" />
                    <link rel="apple-touch-icon" type="image/png" href="/frog.png" />

                    <meta name="theme-color" content="#951fd9" />
                </Head>
                <body>
                    <Main />
                    <NextScript />
                </body>
            </Html>
        )
    }
}
