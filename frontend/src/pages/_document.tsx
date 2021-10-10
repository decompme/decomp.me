import Document, { Html, Head, Main, NextScript } from "next/document"

export default class MyDocument extends Document {
    render() {
        return (
            <Html lang="en">
                <Head>
                    <meta charSet="utf-8" />
                    <meta name="description" content="Crowdsourced decompilation website" />

                    <link rel="shortcut icon" type="image/png" href="/frog.png" />
                    <link rel="apple-touch-icon" type="image/png" href="/frog.png" />
                </Head>
                <body>
                    <Main />
                    <NextScript />
                </body>
            </Html>
        )
    }
}
