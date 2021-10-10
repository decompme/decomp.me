// https://nextjs.org/docs/basic-features/layouts#single-shared-layout-with-custom-app

import Layout from "../components/Layout"

import "../global.css"

export default function MyApp({ Component, pageProps }) {
    return <Layout>
        <Component {...pageProps} />
    </Layout>
}
