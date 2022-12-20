import NotFound from "../app/not-found"
import Footer from "../components/Footer"
import Nav from "../components/Nav"

export default function Error404Page() {
    return <>
        <Nav />
        <NotFound />
        <Footer />
    </>
}
