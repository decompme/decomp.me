import { useState, useEffect } from "react"

import { useRouter } from "next/router"

import { useSWRConfig } from "swr"

import GitHubLoginButton from "../components/GitHubLoginButton"
import * as api from "../lib/api"

import styles from "./login.module.css"

// Handles GitHub OAuth callback
export default function LoginPage() {
    const router = useRouter()
    const [error, setError] = useState(null)
    const { mutate } = useSWRConfig()
    const code = (router.query.code ?? "").toString()
    const next = (router.query.next ?? "").toString()

    useEffect(() => {
        if (code) {
            setError(null)
            api.post("/user", { code }).then((user: api.User) => {
                if (next) {
                    mutate("/user", user)
                    router.replace(next)
                } else {
                    window.close()
                }
            }).catch(error => {
                console.error(error)
                setError(error)
            })
        }
    }, [code, router, mutate, next])

    return <>
        <main className={styles.container}>
            {error ? <div className={styles.card}>
                <p className={styles.error}>
                    Sign-in error.<br />
                    {error.message}
                </p>
                <p>
                    Try again:
                </p>
                <GitHubLoginButton />
            </div> : code ? <>
                Signing in...
            </> : <div className={styles.card}>
                <p>
                    Sign in to decomp.me
                </p>
                <GitHubLoginButton />
            </div>}
        </main>
    </>
}
