import Document, { Html, Head, Main, NextScript } from "next/document"

export default class MyDocument extends Document {
    render() {
        return (
            <Html lang="en" className="dark">
                <Head>
                    <meta charSet="utf-8" />

                    <link rel="manifest" href="/manifest.json" />

                    <link rel="shortcut icon" href="/purplefrog.svg" />
                    <link rel="apple-touch-icon" href="/purplefrog-bg-180.png" />

                    <meta name="darkreader-lock" />
                </Head>
                <body className="bg-gray-1 font-sans text-gray-12 subpixel-antialiased">
                    <Main />
                    <NextScript />
                </body>
            </Html>
        )
    }
}
