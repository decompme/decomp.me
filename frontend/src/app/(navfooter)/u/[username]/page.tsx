import { Metadata } from "next"

import { notFound } from "next/navigation"

import { MarkGithubIcon } from "@primer/octicons-react"

import GhostButton from "@/components/GhostButton"
import ScratchList, { ScratchItemNoOwner } from "@/components/ScratchList"
import UserAvatar from "@/components/user/UserAvatar"
import { get } from "@/lib/api/request"
import { User } from "@/lib/api/types"
import { userGithubHtmlUrl, userUrl } from "@/lib/api/urls"

export async function generateMetadata({ params }: { params: { username: string } }):Promise<Metadata> {
    let user: User

    try {
        user = await get(`/users/${params.username}`)
    } catch (error) {
        console.error(error)
    }

    if (!user) {
        return notFound()
    }

    return {
        title: user.username,
        openGraph: {
            title: user.username,
        },
    }
}

export default async function Page({ params }: { params: { username: string } }) {
    let user: User
    try {
        user = await get(`/users/${params.username}`)
    } catch (error) {
        console.error(error)
    }

    if (!user) {
        return notFound()
    }

    return <main className="mx-auto w-full max-w-3xl p-4">
        <header className="mb-4 flex flex-col items-center gap-6 border-b border-gray-6 py-4 md:flex-row">
            <UserAvatar className="h-16 w-16" user={user} />
            <div>
                <h1 className="text-center text-2xl font-medium tracking-tight md:text-left">
                    {user.username}
                </h1>

                <div className="flex flex-wrap items-center gap-2 pt-1 text-sm text-gray-11">
                    <GhostButton href={userGithubHtmlUrl(user)}>
                        <div className="flex items-center gap-1">
                            {userGithubHtmlUrl(user) && <MarkGithubIcon size={16} aria-label="GitHub username" />}
                            <span>{user.username}</span>
                        </div>
                    </GhostButton>
                </div>
            </div>
        </header>

        <section>
            <h2 className="pb-2 text-lg font-medium tracking-tight">Scratches</h2>
            <ScratchList
                url={userUrl(user) + "/scratches?page_size=20"}
                item={ScratchItemNoOwner}
            />
        </section>
    </main>
}
