// https://nextjs.org/docs/basic-features/layouts#single-shared-layout-with-custom-app

import Router from "next/router"

import ProgressBar from "@badrap/bar-of-progress"

import Layout from "../components/Layout"

import "../global.css"

const progress = new ProgressBar({
    size: 2,
    color: "#951fd9",
    className: "routerProgressBar",
    delay: 0,
})

Router.events.on("routeChangeStart", progress.start)
Router.events.on("routeChangeComplete", progress.finish)
Router.events.on("routeChangeError", progress.finish)

export default function MyApp({ Component, pageProps }) {
    return <Layout>
        <Component {...pageProps} />
    </Layout>
}
