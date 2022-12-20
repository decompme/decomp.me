import Link from "next/link"

import UserMention from "../../components/user/UserMention"
import * as api from "../../lib/api/server"

import styles from "./page.module.scss"

const MAINTAINER_USERNAMES = ["ethteck", "nanaian"]
const CONTRIBUTOR_USERNAMES = [
    "zbanks",
    "simonlindholm",
    "mkst",
    "FluentCoding",
    "TGEnigma",
    "octorock",
    "JoshDuMan",
    "Henny022",
    "AngheloAlf",
    "EpochFlame",
    "SeekyCt",
    "Trevor89",
    "MegaMech",
]

type Contributor = {
    type: "decompme"
    user: api.User
} | {
    type: "github"
    user: { login: string, avatar_url?: string }
}

async function getContributor(username: string): Promise<Contributor> {
    try {
        // Try and get decomp.me information if they have an account
        const user: api.User = await api.get(`/users/${username}`)
        return {
            type: "decompme",
            user,
        }
    } catch (error) {
        // Fall back to GitHub information
        const req = await fetch(`https://api.github.com/users/${username}`)
        const user = await req.json()

        if (user.message) {
            // Rate limit :(
            return {
                type: "github",
                user: { login: username },
            }
        }

        return {
            type: "github",
            user,
        }
    }
}

function Contributor({ contributor }: { contributor: Contributor }) {
    return <UserMention user={contributor.user} />
}

export default async function Page() {
    const maintainers = await Promise.all(MAINTAINER_USERNAMES.map(getContributor))
    const contributors = await Promise.all(CONTRIBUTOR_USERNAMES.map(getContributor))

    return <main>
        <div className={styles.container}>
            <h1 className={styles.heading}>
                Credits
            </h1>

            <p>
                decomp.me is developed by <Contributor contributor={maintainers[0]} /> and <Contributor contributor={maintainers[1]} />.
            </p>

            <div>
                <h3 className={styles.subheading}>
                    Contributors
                </h3>
                <ul className={styles.contributors}>
                    {contributors.map(contributor => {
                        return <li key={contributor.type === "decompme" ? contributor.user.username : contributor.user.login}>
                            <Contributor contributor={contributor} />
                        </li>
                    })}
                </ul>
            </div>

            <hr className={styles.rule} />

            <div>
                <h3 className={styles.subheading}>
                    Projects
                </h3>
                <ul>
                    <li>
                        <Link href="https://github.com/simonlindholm/asm-differ">
                            simonlindholm/asm-differ
                        </Link>
                    </li>
                    <li>
                        <Link href="https://github.com/matt-kempster/m2c">
                            matt-kempster/m2c
                        </Link>
                    </li>
                </ul>
            </div>

            <hr className={styles.rule} />

            <div>
                <h3 className={styles.subheading}>
                    Icons
                </h3>
                <ul>
                    <li>Octicons by GitHub</li>
                    <li>
                        <Link href="https://github.com/file-icons/icons">
                            file-icons/icons
                        </Link>
                    </li>
                    <li>
                        <Link href="https://github.com/coreui/coreui-icons">
                            coreui/coreui-icons
                        </Link>
                    </li>
                    <li>
                        <Link href="https://www.deviantart.com/maxigamer/art/FONT-New-Fontendo-23DSi-Lite-XL-DOWNLOAD-ZIP-552834059">
                            New Fontendo 23DSi Lite XL
                        </Link>
                    </li>
                    <li>
                        <Link href="https://thenounproject.com/icon/gameboy-advanced-752507/">
                            GBA SVG by Andrew Vester from NounProject.com
                        </Link>
                    </li>
                    <li>
                        <Link href="https://commons.wikimedia.org/wiki/File:Happy_Mac.svg">
                            Happy Mac by NiloGlock
                        </Link>
                    </li>
                    <li>
                        <Link href="https://commons.wikimedia.org/wiki/File:Tiger-like-x.svg">
                            Tiger-like-x by Althepal
                        </Link>
                    </li>
                </ul>
            </div>
        </div>
    </main>
}
