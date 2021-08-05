import { h, Fragment } from "preact"
import Router from "preact-router"
import { Toaster } from "react-hot-toast"
import { SkeletonTheme } from "react-loading-skeleton"

import NewScratch from "./scratch/NewScratch"
import Scratch from "./scratch/Scratch"

export default function App() {
    return <SkeletonTheme color="#1c1e23" highlightColor="#26292d">
        <nav>
            <a href="/">decomp.me</a>
            <a href="https://github.com/ethteck/decomp.me" class="button">Contribute to decomp.me on GitHub</a>
        </nav>

        <main>
            <Router>
                <div path="/">
                    <a href="/scratch">Create a scratch</a>
                </div>

                <NewScratch path="/scratch" />
                <Scratch path="/scratch/:slug" />

                <div default>
                    Page not found :(<br />
                </div>
            </Router>
        </main>

        <Toaster
            position="bottom-center"
            reverseOrder={true}
            toastOptions={{
                style: {
                    borderRadius: '100px',
                    background: '#333',
                    color: '#fff',
                },
            }}
        />
    </SkeletonTheme>
}
