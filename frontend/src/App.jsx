import { h, Fragment } from "preact"
import { BrowserRouter as Router, Route, Switch, Link, Redirect } from "react-router-dom"
import { Toaster } from "react-hot-toast"
import { SkeletonTheme } from "react-loading-skeleton"
import { MarkGithubIcon, PlusIcon } from "@primer/octicons-react"

import NewScratch from "./scratch/NewScratch"
import Scratch from "./scratch/Scratch"
import CompilerOpts from "./compiler/CompilerOpts"

export default function App() {
    return <SkeletonTheme color="#1c1e23" highlightColor="#26292d">
        <Router>
            <nav>
                <Link class="button" to="/scratch">
                    <PlusIcon size={16} /> New Scratch
                </Link>

                <a class="button" href="https://github.com/ethteck/decomp.me" target="_blank" rel="noopener noreferrer">
                    <MarkGithubIcon size={16} /> Contribute to decomp.me on GitHub!
                </a>
            </nav>

            <main>
                <Switch>
                    <Route exact path="/">
                        <Redirect to="/scratch" />
                    </Route>

                    <Route exact path="/scratch">
                        <NewScratch />
                    </Route>

                    <Route path="/scratch/:slug">
                        <Scratch />
                    </Route>

                    <Route exact path="/test/compileropts">
                        <CompilerOpts />
                    </Route>
                </Switch>
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
        </Router>
    </SkeletonTheme>
}
