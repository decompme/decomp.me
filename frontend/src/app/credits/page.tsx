import UserMention from "@/components/user/UserMention"
import * as api from "@/lib/api/server"

import ContributorsList, { getContributorUsernames, usernameToContributor } from "./ContributorsList"
import LinkList from "./LinkList"

const MAINTAINER_USERNAMES = ["ethteck", "nanaian"]
const OTHER_PROJECTS = {
    "asm-differ": "https://github.com/simonlindholm/asm-differ",
    "m2c": "https://github.com/matt-kempster/m2c",
    "Django": "https://www.djangoproject.com/",
    "Django REST Framework": "https://www.django-rest-framework.org/",
    "Next.js": "https://nextjs.org/",
    "React": "https://reactjs.org/",
    "Tailwind CSS": "https://tailwindcss.com/",
    "SWR": "https://swr.vercel.app/",
}
const ICON_SOURCES = {
    "Octicons": "https://primer.style/octicons/",
    "file-icons/icons": "https://github.com/file-icons/icons",
    "coreui/coreui-icons": "https://github.com/coreui/coreui-icons",
    "New Fontendo 23DSi Lite XL": "https://www.deviantart.com/maxigamer/art/FONT-New-Fontendo-23DSi-Lite-XL-DOWNLOAD-ZIP-552834059",
    "GBA SVG by Andrew Vester from NounProject.com": "https://thenounproject.com/icon/gameboy-advanced-752507/",
    "Happy Mac by NiloGlock": "https://commons.wikimedia.org/wiki/File:Happy_Mac.svg",
    "Tiger-like-x by Althepal": "https://commons.wikimedia.org/wiki/File:Tiger-like-x.svg",
}

type Contributor = {
    type: "decompme"
    user: api.User
} | {
    type: "github"
    user: { login: string }
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
        // No need to ask their API for data since we just need the username
        return {
            type: "github",
            user: { login: username },
        }
    }
}

function Contributor({ contributor }: { contributor: Contributor }) {
    return <UserMention user={contributor.user} />
}

export default async function Page() {
    const maintainers = await Promise.all(MAINTAINER_USERNAMES.map(getContributor))
    const contributors = await getContributorUsernames().then(usernames => Promise.all(usernames.map(usernameToContributor)))

    return <main>
        <div className="mx-auto max-w-prose p-4 pb-2 text-justify text-base leading-normal">
            <h1 className="text-2xl font-semibold tracking-tight text-gray-12 md:text-3xl">
                Credits
            </h1>
            <p className="py-4">
                decomp.me is maintained by <Contributor contributor={maintainers[0]} /> and <Contributor contributor={maintainers[1]} />.
            </p>
            <div className="my-4 border-y border-gray-6">
                <ContributorsList contributors={contributors} />
            </div>
            <div className="py-4">
                <h3 className="text-lg font-medium tracking-tight text-gray-12 md:text-2xl">
                    Acknowledgements
                </h3>
                <p className="my-2">
                    decomp.me is built on top of many other open source projects, including:
                </p>
                <LinkList links={OTHER_PROJECTS} />
                <p className="my-2">
                    We also use icons from the following sources:
                </p>
                <LinkList links={ICON_SOURCES} />
            </div>
        </div>
    </main>
}
