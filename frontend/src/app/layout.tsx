import PlausibleProvider from "next-plausible"

import ThemeProvider from "./ThemeProvider"

import "allotment/dist/style.css"
import "@/pages/_app.scss" // TODO: move to sibling global.scss

export const metadata = {
    title: {
        default: "decomp.me",
        template: "%s | decomp.me",
    },
    openGraph: {
        siteName: "decomp.me",
        type: "website",
    },
}

export default function RootLayout({
    children,
}: {
  children: React.ReactNode
}) {
    return <html lang="en" className="dark">
        <head>
            <meta charSet="utf-8" />

            <meta name="theme-color" content="#282e31" />
            <meta name="viewport" content="width=device-width" />
            <meta name="darkreader-lock" />

            <link rel="manifest" href="/manifest.json" />

            <link rel="shortcut icon" href="/purplefrog.svg" />
            <link rel="apple-touch-icon" href="/purplefrog-bg-180.png" />

            <PlausibleProvider
                domain="decomp.me"
                customDomain="https://stats.decomp.me"
                selfHosted={true}
                trackOutboundLinks={true}
            />
            <ThemeProvider />
        </head>
        <body className="flex flex-col bg-gray-1 font-sans text-gray-12 subpixel-antialiased">
            {children}
        </body>
    </html>
}
