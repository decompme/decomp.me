import ScratchList, { SingleLineScratchItem } from "@/components/ScratchList"
import SetPageTitle from "@/components/SetPageTitle"
import YourScratchList from "@/components/YourScratchList"

import WelcomeInfo from "./WelcomeInfo"

export default function Page() {
    return <main>
        <SetPageTitle title="" />
        <header className="w-full py-16">
            <WelcomeInfo />
        </header>
        <div className="mx-auto flex w-full max-w-screen-xl flex-col gap-16 p-8 md:flex-row">
            <section className="md:w-1/2 lg:w-1/4">
                <h2 className="mb-2 text-lg">Your scratches</h2>
                <YourScratchList
                    item={SingleLineScratchItem}
                />
            </section>
            <section className="md:w-1/2 lg:w-3/4">
                <h2 className="mb-2 text-lg">Recently updated</h2>
                <ScratchList url="/scratch?page_size=30" />
            </section>
        </div>
    </main>
}
