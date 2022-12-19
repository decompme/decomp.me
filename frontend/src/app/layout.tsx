"use client" // TEMP

import { useEffect, useState } from "react"

import PlausibleProvider from "next-plausible"

import type {} from "react/next"

import { applyColorScheme } from "../lib/codemirror/color-scheme"
import { isMacOS } from "../lib/device"
import * as settings from "../lib/settings"

import "./globals.css"
import "../pages/_app.scss"

export default function RootLayout({
    children,
}: {
  children: React.ReactNode
}) {
    const [codeColorScheme, setCodeColorScheme] = settings.useCodeColorScheme()
    useEffect(() => {
        applyColorScheme(codeColorScheme)
    }, [codeColorScheme])

    const [theme] = settings.useTheme()
    const [themeColor, setThemeColor] = useState("#282e31")
    useEffect(() => {
        // Apply theme
        document.body.classList.remove("theme-light")
        document.body.classList.remove("theme-dark")

        const realTheme = theme == "auto"
            ? (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark")
            : theme
        document.body.classList.add(`theme-${realTheme}`)

        // If using the default code color scheme (Frog), pick the variant that matches the site theme
        if (document.hasFocus) {
            setCodeColorScheme(current => {
                if (current === "Frog Dark" || current === "Frog Light") {
                    return realTheme == "dark" ? "Frog Dark" : "Frog Light"
                } else {
                    return current
                }
            })
        }

        // Set theme-color based on active theme
        const style = window.getComputedStyle(document.body)
        setThemeColor(style.getPropertyValue("--g300")) // Same color as navbar
    }, [theme, setCodeColorScheme])

    const [monospaceFont] = settings.useMonospaceFont()
    useEffect(() => {
        document.body.style.removeProperty("--monospace")
        if (monospaceFont) {
            document.body.style.setProperty("--monospace", monospaceFont + ", monospace")
        }
    }, [monospaceFont])

    const [codeLineHeight] = settings.useCodeLineHeight()
    useEffect(() => {
        document.body.style.removeProperty("--code-line-height")
        document.body.style.setProperty("--code-line-height", codeLineHeight)
    }, [codeLineHeight])

    useEffect(() => {
        if (isMacOS()) {
            document.body.classList.add("device-macos")
        }
    }, [])

    // Unregister all service workers (#593) - temporary until we make a new, better service worker
    useEffect(() => {
        if ("serviceWorker" in navigator) {
            navigator.serviceWorker.getRegistrations().then(registrations => {
                for (const registration of registrations) {
                    registration.unregister()
                    console.warn("unregistered service worker:", registration)
                }
            })
        }
    }, [])

    return (
        <PlausibleProvider
            domain="decomp.me"
            customDomain="https://stats.decomp.me"
            selfHosted={true}
        >
            <html lang="en">
                <body>
                    {children}
                </body>
            </html>
        </PlausibleProvider>
    )
}
