// https://nextjs.org/docs/basic-features/layouts#single-shared-layout-with-custom-app

import { useEffect, useState } from "react"

import type {} from "react/next"

import Head from "next/head"
import Router from "next/router"

import ProgressBar from "@badrap/bar-of-progress"
import PlausibleProvider from "next-plausible"

import Layout from "../components/Layout"
import "./_app.scss"
import * as settings from "../lib/settings"

const progress = new ProgressBar({
    size: 2,
    color: "var(--accent)",
    className: "routerProgressBar",
    delay: 0,
})

Router.events.on("routeChangeStart", progress.start)
Router.events.on("routeChangeComplete", progress.finish)
Router.events.on("routeChangeError", progress.finish)

export default function MyApp({ Component, pageProps }) {
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

        // Set theme-color based on active theme
        const style = window.getComputedStyle(document.body)
        setThemeColor(style.getPropertyValue("--g300")) // Same color as navbar
    }, [theme])

    const [monospaceFont] = settings.useMonospaceFont()
    useEffect(() => {
        document.body.style.removeProperty("--monospace")
        if (monospaceFont) {
            document.body.style.setProperty("--monospace", monospaceFont + ", monospace")
        }
    }, [monospaceFont])

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
