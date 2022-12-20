import GhostButton from "../components/GhostButton"
import Frog from "../components/Nav/frog.svg"

export default function NotFound() {
    return <main className="mx-auto flex max-w-prose items-center justify-center gap-4 px-4 py-6 text-base leading-normal">
        <div>
            <div className="flex items-center justify-center gap-8">
                <Frog className="h-16 w-16 saturate-0" />
                <h1 className="text-xl font-medium lg:text-3xl">
                    <span className="pr-8 font-normal">404</span>
                    <span className="text-black dark:text-white">frog not found</span>
                </h1>
            </div>

            <p className="py-4 text-gray-6 dark:text-gray-3">
                The page you are looking for is not here. Consider checking the URL.
            </p>

            <div className="flex items-center justify-center gap-2 py-4">
                <GhostButton href="/">
                    Back to dashboard
                </GhostButton>
            </div>
        </div>
    </main>
}
