import Link from "next/link"

import Logotype from "./Logotype"

const link = "hover:text-black dark:hover:text-white transition-colors active:translate-y-px"

function Separator() {
    return <div className="h-4 w-px bg-gray-5/20" />
}

export default function Footer() {
    return (
        <footer className="mx-auto mt-32 w-full px-4 sm:px-6 lg:px-8">
            <div className="border-t border-black/10 py-10 dark:border-white/[0.06]">
                <div className="flex items-center justify-center">
                    <Link href="/" className={link}>
                        <Logotype />
                    </Link>
                </div>
                <div className="mt-12 flex items-center justify-center space-x-4 text-sm leading-6">
                    <Link href="/privacy" className={link}>
                        Privacy policy
                    </Link>
                    <Separator />
                    <Link href="https://status.decomp.me" className={link}>
                        Status
                    </Link>
                    <Separator />
                    <Link href="https://github.com/decompme/decomp.me" className={link}>
                        GitHub
                    </Link>
                    <Separator />
                    <Link href="https://discord.gg/sutqNShRRs" className={link}>
                        Chat
                    </Link>
                    <Separator />
                    <Link href="/credits" className={link}>
                        Credits
                    </Link>
                </div>
            </div>
        </footer>
    )
}
