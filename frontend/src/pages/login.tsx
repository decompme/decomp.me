import { useState, useEffect } from "react"

import { useRouter } from "next/router"

import { useSWRConfig } from "swr"

import GitHubLoginButton from "../components/GitHubLoginButton"
import LoadingSpinner from "../components/loading.svg"
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
                if (user.is_anonymous) {
                    return Promise.reject(new Error("Still not logged-in."))
                }

                mutate("/user", user)

                if (next) {
                    router.replace(next)
                } else if (window.opener) {
                    window.postMessage({
                        source: "decomp_me_login",
                        user,
                    }, window.opener)
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
                <GitHubLoginButton popup={false} />
            </div> : code ? <div className={styles.loading}>
                <LoadingSpinner width={32} />
                Signing you in...
            </div> : <div className={styles.card}>
                <p>
                    Sign in to decomp.me
                </p>
                <GitHubLoginButton popup={false} />
            </div>}
        </main>
    </>
}
