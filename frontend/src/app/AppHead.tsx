import PageTitle, { Props } from "@/components/PageTitle"

/** For head.js files */
export default function AppHead(props: Props) {
    return <>
        <PageTitle {...props} />

        <meta charSet="utf-8" />

        <meta name="theme-color" content="#282e31" />
        <meta name="viewport" content="width=device-width" />
        <meta name="darkreader-lock" />

        <link rel="manifest" href="/manifest.json" />

        <link rel="shortcut icon" href="/purplefrog.svg" />
        <link rel="apple-touch-icon" href="/purplefrog-bg-180.png" />
    </>
}
