import { h, Fragment } from "preact"
import Router from "preact-router"
import { Toaster } from "react-hot-toast"

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
    </>
}
