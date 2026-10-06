import type { Metadata } from "next";
import { SingleLineScratchItem } from "@/components/ScratchItem";
import ScratchList from "@/components/ScratchList";
import type { SortMode } from "@/components/SortScratch";
import YourScratchList from "@/components/YourScratchList";

import WelcomeInfo from "./WelcomeInfo";

export const revalidate = 60;

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
            <div className="mx-auto flex w-full max-w-screen-xl flex-col gap-16 px-8 py-4 md:flex-row md:py-8">
                <section className="md:w-1/2 lg:w-1/4">
                    <div>
                        <h2 className="mb-2 text-lg">Your scratches</h2>
                        <YourScratchList
                            item={SingleLineScratchItem}
                            skeletonVariant="compact"
                        />
                    </div>
                    <div className="mt-10">
                        <ScratchList
                            title="Favorites"
                            url="/scratch/favorites?page_size=20"
                            skeletonVariant="compact"
                        />
                    </div>
                </section>
                <section className="md:w-1/2 lg:w-3/4">
                    <div className="mb-10">
                        <ScratchList
                            title="Help wanted"
                            isPublic
                            isSortable
                            initialSortMode={"-help_wanted_at" as SortMode}
                            sortOptions={{
                                "-help_wanted_at": "Most recent",
                                help_wanted_at: "Oldest",
                                "-help_wanted_count": "Most votes",
                            }}
                            url="/scratch/help-wanted?page_size=20"
                        />
                    </div>
                    <div>
                        <h2 className="mb-2 text-lg">Recent activity</h2>
                        <ScratchList
                            isPublic
                            url="/scratch?page_size=20&has_owner=true"
                        />
                    </div>
                </section>
            </div>
        </main>
    );
}
