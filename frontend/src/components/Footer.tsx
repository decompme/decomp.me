import Link from "next/link"

import { EyeClosedIcon, MarkGithubIcon, PeopleIcon } from "@primer/octicons-react"

import Discord from "./discord.svg"
import ErrorBoundary from "./ErrorBoundary"
import styles from "./Footer.module.scss"

const commitHash = process.env.NEXT_PUBLIC_COMMIT_HASH

export default function Footer() {
    return <ErrorBoundary className={styles.footer}>
        <footer className={styles.footer}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 250">
                <path
                    fill="var(--g300)"
                    fillOpacity="1"
                    d="M0,128L60,138.7C120,149,240,171,360,160C480,149,600,107,720,85.3C840,64,960,64,1080,90.7C1200,117,1320,171,1380,197.3L1440,224L1440,320L1380,320C1320,320,1200,320,1080,320C960,320,840,320,720,320C600,320,480,320,360,320C240,320,120,320,60,320L0,320Z"
                />
            </svg>
            <div className={styles.main}>
                <div className={styles.links}>
                    <Link href="https://github.com/decompme/decomp.me">
                        <a className={styles.link}>
                            <MarkGithubIcon size={24} />
                            Contribute to decomp.me
                        </a>
                    </Link>

                    <Link href="https://discord.gg/sutqNShRRs">
                        <a className={styles.link}>
                            <Discord width={24} />
                            Chat on Discord
                        </a>
                    </Link>

                    <Link href="/credits">
                        <a className={styles.link}>
                            <PeopleIcon size={24} />
                            Credits
                        </a>
                    </Link>

                    <Link href="/privacy">
                        <a className={styles.link}>
                            <EyeClosedIcon size={24} />
                            Privacy policy
                        </a>
                    </Link>
                </div>

                <div className={styles.commitHash}>
                    <Link href={`https://github.com/decompme/decomp.me/commit/${commitHash}`}>
                        <a title="Commit hash">
                            {commitHash.slice(0, 7)}
                        </a>
                    </Link>
                </div>
            </div>
        </footer>
    </ErrorBoundary>
}
