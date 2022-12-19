import Link from "next/link"
import Frog from "./Nav/frog.svg"

const link = "hover:underline active:translate-y-px"

function Logotype() {
    return <div className="flex items-center space-x-2">
        <Frog className="w-7 h-7" />
        <span className="text-xl font-semibold leading-6 tracking-tight">decomp.me</span>
    </div>
}

function Separator() {
    return <div className="h-4 w-px bg-gray-5/20" />
}

export default function Footer() {
    return (
        <footer className="mx-auto mt-32 w-full max-w-container px-4 sm:px-6 lg:px-8">
            <div className="border-t border-black/10 dark:border-white/[0.06] py-10">
                <div className="flex items-center justify-center">
                    <Link href="/" className={link}>
                        <Logotype />
                    </Link>
                </div>
                <div className="mt-12 flex items-center justify-center space-x-4 text-sm font-semibold leading-6">
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
