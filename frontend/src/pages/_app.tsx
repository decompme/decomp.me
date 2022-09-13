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

    const [theme] = settings.useTheme()
    const [themeColor, setThemeColor] = useState("#282e31")
    useEffect(() => {
        // Apply theme
        document.body.classList.remove("theme-light")
        document.body.classList.remove("theme-dark")

        const realTheme = theme == "auto"
            ? (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark")
            : theme
        document.body.classList.add(`theme-${realTheme}`)

        // If using the default code color scheme (Frog), pick the variant that matches the site theme
        setCodeColorScheme(current => {
            if (current === "Frog Dark" || current === "Frog Light") {
                return realTheme == "dark" ? "Frog Dark" : "Frog Light"
            } else {
                return current
            }
        })

        // Set theme-color based on active theme
        const style = window.getComputedStyle(document.body)
        setThemeColor(style.getPropertyValue("--g300")) // Same color as navbar
    }, [theme, setCodeColorScheme])

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

    return <Layout>
        <Head>
            <meta name="theme-color" content={themeColor} />
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
