import { h, Fragment } from "preact"
import Router from "preact-router"

import NewScratch from "./scratch/NewScratch"
import Scratch from "./scratch/Scratch"

export default function App() {
    return <>
        <nav>
            <a href="/">decomp.me</a>
        </nav>

        <main>
            <Router>
                <div path="/">
                    <a href="/scratch">Click me to make a scratch</a>
                </div>

                <NewScratch path="/scratch" />
                <Scratch path="/scratch/:slug" />

                <div default>
                    Page not found :(<br />
                </div>
            </Router>
        </main>
    </>
}
