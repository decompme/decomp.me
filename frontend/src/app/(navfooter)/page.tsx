import type { Metadata } from "next";

import ScratchList from "@/components/ScratchList";
import { SingleLineScratchItem } from "@/components/ScratchItem";
import YourScratchList from "@/components/YourScratchList";

import WelcomeInfo from "./WelcomeInfo";

export async function generateMetadata(): Promise<Metadata> {
    const title = "decomp.me";

    const description = "A collaborative decompilation platform.";

    return {
        openGraph: {
            title: title,
            description: description,
            url: "https://decomp.me",
            type: "website",
            images: [
                {
                    url: "opengraph-image",
                    width: 1200,
                    height: 400,
                },
            ],
        },
    };
}

export default function Page() {
    return (
        <main>
            <header className="w-full py-16">
                <WelcomeInfo />
            </header>
            <div className="mx-auto flex w-full max-w-screen-xl flex-col gap-16 p-8 md:flex-row">
                <section className="md:w-1/2 lg:w-1/4">
                    <h2 className="mb-2 text-lg">Your scratches</h2>
                    <YourScratchList item={SingleLineScratchItem} />
                </section>
                <section className="md:w-1/2 lg:w-3/4">
                    <h2 className="mb-2 text-lg">Recent activity</h2>
                    <ScratchList url="/scratch?page_size=20" />
                </section>
            </div>
        </main>
    );
}
