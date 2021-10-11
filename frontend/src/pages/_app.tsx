// https://nextjs.org/docs/basic-features/layouts#single-shared-layout-with-custom-app

import { useEffect, useState } from "react"

import Head from "next/head"
import Router from "next/router"

import ProgressBar from "@badrap/bar-of-progress"

import Layout from "../components/Layout"

import "./_app.scss"

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
    const [themeColor, setThemeColor] = useState("#242829") // --g400 from themePlum

    useEffect(() => {
        const style = window.getComputedStyle(document.body)

        // Same color as navbar
        setThemeColor(style.getPropertyValue("--g400"))
    }, [])

    return <Layout>
        <Head>
            <meta name="theme-color" content={themeColor} />
        </Head>
        <Component {...pageProps} />
    </Layout>
}
