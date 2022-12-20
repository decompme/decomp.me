import Link from "next/link"

import GhostButton from "./GhostButton"
import Logotype from "./Logotype"

function Separator() {
    return <div className="h-4 w-px bg-gray-5/20" />
}

export default function Footer() {
    return (
        <footer className="mx-auto mt-32 w-full px-4 sm:px-6 lg:px-8">
            <div className="border-t border-black/10 py-10 dark:border-white/[0.06]">
                <div className="flex items-center justify-center">
                    <Link href="/" >
                        <Logotype />
                    </Link>
                </div>
                <div className="mt-12 flex items-center justify-center gap-2 text-sm leading-6">
                    <GhostButton href="/privacy">
                        Privacy policy
                    </GhostButton>
                    <Separator />
                    <GhostButton href="https://status.decomp.me">
                        Status
                    </GhostButton>
                    <Separator />
                    <GhostButton href="https://github.com/decompme/decomp.me">
                        GitHub
                    </GhostButton>
                    <Separator />
                    <GhostButton href="https://discord.gg/sutqNShRRs">
                        Chat
                    </GhostButton>
                    <Separator />
                    <GhostButton href="/credits">
                        Credits
                    </GhostButton>
                </div>
            </div>
        </footer>
    )
}
