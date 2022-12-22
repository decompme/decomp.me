import { notFound } from "next/navigation"

import { MarkGithubIcon } from "@primer/octicons-react"

import GhostButton from "@/components/GhostButton"
import ScratchList, { ScratchItemNoOwner } from "@/components/ScratchList"
import UserAvatar from "@/components/user/UserAvatar"
import * as api from "@/lib/api/server"

import SetPageTitle from "../../SetPageTitle"

export default async function Page({ params }: { params: { username: string } }) {
    let user: api.User
    try {
        user = await api.get(`/users/${params.username}`)
    } catch (error) {
        console.error(error)
    }

    if (!user) {
        return notFound()
    }

    return <main className="mx-auto w-full max-w-3xl p-4">
        <SetPageTitle title={user.username} />

        <header className="mb-4 flex flex-col items-center gap-6 border-b border-black/10 py-4 dark:border-white/[0.06] md:flex-row">
            <UserAvatar className="h-16 w-16" user={user} />
            <div>
                <h1 className="text-center text-2xl font-medium tracking-tight text-gray-8 dark:text-gray-1 md:text-left">
                    {user.name}
                </h1>

                <div className="flex flex-wrap items-center gap-2 pt-1 text-sm text-gray-6 dark:text-gray-5">
                    <GhostButton href={user.github_html_url}>
                        <div className="flex items-center gap-1">
                            {user.github_html_url && <MarkGithubIcon size={16} aria-label="GitHub username" />}
                            <span>{user.username}</span>
                        </div>
                    </GhostButton>
                </div>
            </div>
        </header>

        <section>
            <h2 className="pb-2 text-lg font-medium tracking-tight">Scratches</h2>
            <ScratchList
                url={user.url + "/scratches?page_size=32"}
                item={ScratchItemNoOwner}
            />
        </section>
    </main>
}