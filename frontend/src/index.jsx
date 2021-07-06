import { h, render } from "preact"
import "preact/devtools"
import App from "./App.js"

const root = document.getElementById("root")

if (root) {
    render(<App />, root)
} else {
    console.error("what the fuck?")
}
