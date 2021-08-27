import { h, Fragment } from "preact"
import { BrowserRouter as Router, Route, Switch, Link, Redirect } from "react-router-dom"
import { Toaster } from "react-hot-toast"
import { SkeletonTheme } from "react-loading-skeleton"
import { PlusIcon } from "@primer/octicons-react"

import NewScratch from "./scratch/NewScratch"
import Scratch from "./scratch/Scratch"
import LoginState from "./login/LoginState"
import GitHubOAuthCallbackHandler from "./login/GitHubOAuthCallbackHandler"

export default function App() {
    return <SkeletonTheme color="#1c1e23" highlightColor="#26292d">
        <Router>
            <nav>
                <Link class="button" to="/scratch">
                    <PlusIcon size={16} /> New Scratch
                </Link>

                <LoginState />
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

                    <Route exact path="/login">
                        <GitHubOAuthCallbackHandler />
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
