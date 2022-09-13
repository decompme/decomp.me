// https://nextjs.org/docs/basic-features/layouts#single-shared-layout-with-custom-app

import { useEffect, useState } from "react"

import type {} from "react/next"

import Head from "next/head"

import PlausibleProvider from "next-plausible"

import Layout from "../components/Layout"

import "./_app.scss"

export default function MyApp({ Component, pageProps }) {
    const [themeColor, setThemeColor] = useState("#282e31") // --g400 from themePlum

    useEffect(() => {
        const style = window.getComputedStyle(document.body)

        // Same color as navbar
        setThemeColor(style.getPropertyValue("--g400"))
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
