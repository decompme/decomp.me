import { BrowserRouter as Router, Route, Switch, Redirect } from "react-router-dom"
import { Toaster } from "react-hot-toast"
import { SkeletonTheme } from "react-loading-skeleton"

import NewScratchPage from "./pages/scratch"
import ScratchPage from "./pages/scratch/[slug]"
import LoginPage from "./pages/login"
import UserPage from "./pages/~[username]"

export default function App() {
    return <SkeletonTheme color="#1c1e23" highlightColor="#26292d">
        <Router>
            <Switch>
                <Route exact path="/">
                    <Redirect to="/scratch" />
                </Route>

                <Route exact path="/scratch">
                    <NewScratchPage />
                </Route>

                <Route path="/scratch/:slug">
                    <ScratchPage />
                </Route>

                <Route exact path="/login">
                    <LoginPage />
                </Route>

                <Route path="/~:username">
                    <UserPage />
                </Route>

                <Route>
                    {/* 404 */}
                    <Redirect to="/" />
                </Route>
            </Switch>
        </Router>

        <Toaster
            position="bottom-center"
            reverseOrder={true}
            toastOptions={{
                style: {
                    borderRadius: "100px",
                    background: "#333",
                    color: "#fff",
                },
            }}
        />
    </SkeletonTheme>
}
