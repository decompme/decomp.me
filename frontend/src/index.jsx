import React from "react"
import { render } from "react-dom"
import App from "./App.js"

window.React = React

const root = document.getElementById("root")

if (root) {
    render(<App />, root)
} else {
    console.error("this shouldn't happen...")
}

if (undefined /* [snowpack] import.meta.hot */ ) {
    undefined /* [snowpack] import.meta.hot */ .accept()
}
