import Link from "next/link"

import { MarkGithubIcon } from "@primer/octicons-react"

import DiscordIcon from "./discord.svg"
import GhostButton from "./GhostButton"
import Logotype from "./Logotype"

function Separator() {
    return <div className="hidden h-4 w-px bg-gray-6 sm:inline-block" />
}

const commitHash = process.env.NEXT_PUBLIC_COMMIT_HASH

export default function Footer() {
    return <>
        <div className="grow" />
        <footer className="mx-auto mt-16 w-full px-4 sm:px-6 lg:px-8">
            <div className="border-gray-6 border-t py-10">
                <div className="flex items-center justify-center">
                    <Link href="/" >
                        <Logotype />
                    </Link>
                </div>
                <div className="mt-4 flex flex-col items-center justify-center gap-1 sm:flex-row sm:gap-2">
                    <GhostButton href="/privacy">
                        Privacy policy
                    </GhostButton>
                    <Separator />
                    <GhostButton href="/credits">
                        Credits
                    </GhostButton>
                    <Separator />
                    <GhostButton href="/faq">
                        FAQ
                    </GhostButton>
                    <Separator />
                    <GhostButton href="https://github.com/decompme/decomp.me" className="flex items-center gap-1.5">
                        <MarkGithubIcon className="size-4" />
                        Source code
                    </GhostButton>
                    <Separator />
                    <GhostButton href="https://discord.gg/sutqNShRRs" className="flex items-center gap-1.5">
                        <DiscordIcon className="size-4" />
                        Chat
                    </GhostButton>
                    <Separator />
                    <GhostButton href="https://status.decomp.me">
                        Status
                    </GhostButton>
                    <Separator />
                    <GhostButton href="https://stats.decomp.me/decomp.me">
                        Stats
                    </GhostButton>
                </div>

                <div className="mt-2 flex items-center justify-center text-[#808080] text-xs">
                    <Link
                        href={`https://github.com/decompme/decomp.me/commit/${commitHash}`}
                        title="Commit hash">

                        {(commitHash?.slice(0, 7)) || "unknown"}
                    </Link>
                </div>
            </div>
        </footer>
    </>
}
