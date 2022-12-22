import PlausibleProvider from "next-plausible"

import ErrorBoundary from "@/components/ErrorBoundary"
import Footer from "@/components/Footer"
import Nav from "@/components/Nav"

import ThemeProvider from "./ThemeProvider"

import "../pages/_app.scss"

export default function RootLayout({
    children,
}: {
  children: React.ReactNode
}) {
    return <html lang="en" className="dark">
        <head>
            <PlausibleProvider
                domain="decomp.me"
                customDomain="https://stats.decomp.me"
                selfHosted={true}
                trackOutboundLinks={true}
            />
            <ThemeProvider />
        </head>
        <body className="flex flex-col bg-gray-1 font-sans text-gray-12 subpixel-antialiased">
            <ErrorBoundary>
                <Nav />
            </ErrorBoundary>
            {children}
            <ErrorBoundary>
                <Footer />
            </ErrorBoundary>
        </body>
    </html>
}
