// https://nextjs.org/docs/basic-features/layouts#single-shared-layout-with-custom-app

import { useEffect, useState } from "react"

import type {} from "react/next"

import Head from "next/head"

import PlausibleProvider from "next-plausible"

import Layout from "../components/Layout"
import { applyColorScheme } from "../lib/codemirror/color-scheme"
import { isMacOS } from "../lib/device"
import * as settings from "../lib/settings"

import "./_app.scss"

export default function MyApp({ Component, pageProps }) {
    const [codeColorScheme, setCodeColorScheme] = settings.useCodeColorScheme()
    useEffect(() => {
        applyColorScheme(codeColorScheme)
    }, [codeColorScheme])

    const isSiteThemeDark = settings.useIsSiteThemeDark()
    useEffect(() => {
        // Apply theme
        if (isSiteThemeDark) {
            document.documentElement.classList.add("dark")
        } else {
            document.documentElement.classList.remove("dark")
        }

        // If using the default code color scheme (Frog), pick the variant that matches the site theme
        if (document.hasFocus) {
            setCodeColorScheme(current => {
                if (current === "Frog Dark" || current === "Frog Light") {
                    return isSiteThemeDark ? "Frog Dark" : "Frog Light"
                } else {
                    return current
                }
            })
        }
    }, [isSiteThemeDark, setCodeColorScheme])

    const [monospaceFont] = settings.useMonospaceFont()
    useEffect(() => {
        document.body.style.removeProperty("--monospace")
        if (monospaceFont) {
            document.body.style.setProperty("--monospace", monospaceFont + ", monospace")
        }
    }, [monospaceFont])

    const [codeLineHeight] = settings.useCodeLineHeight()
    useEffect(() => {
        document.body.style.removeProperty("--code-line-height")
        document.body.style.setProperty("--code-line-height", codeLineHeight)
    }, [codeLineHeight])

    useEffect(() => {
        if (isMacOS()) {
            document.body.classList.add("device-macos")
        }
    }, [])

    // Unregister all service workers (#593) - temporary until we make a new, better service worker
    useEffect(() => {
        if ("serviceWorker" in navigator) {
            navigator.serviceWorker.getRegistrations().then(registrations => {
                for (const registration of registrations) {
                    registration.unregister()
                    console.warn("unregistered service worker:", registration)
                }
            })
        }
    }, [])

    return <Layout>
        <Head>
            <meta name="theme-color" content="#282e31" />
        </Head>
        <PlausibleProvider
            domain="decomp.me"
            customDomain="https://stats.decomp.me"
            selfHosted={true}
        >
            <Component {...pageProps} />
        </PlausibleProvider>
    </Layout>
}
