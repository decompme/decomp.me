import CompilerServiceUnavailable from "@/components/CompilerServiceUnavailable";
import { CompilerServiceUnavailableError, getPublic } from "@/lib/api/request";

import DESCRIPTION from "./description";
import NewScratchForm from "./NewScratchForm";

export const metadata = {
    title: "New scratch",
};

export const dynamic = "force-dynamic";

export default async function NewScratchPage() {
    let availablePlatforms;
    try {
        availablePlatforms = await getPublic("/platform");
    } catch (error) {
        if (error instanceof CompilerServiceUnavailableError) {
            return <CompilerServiceUnavailable />;
        }
        throw error;
    }

    return (
        <main>
            <h1 className="font-semibold text-2xl text-gray-12 tracking-tight md:text-3xl">
                Start a new scratch
            </h1>
            <p className="max-w-prose py-3 leading-snug">{DESCRIPTION}</p>
            <NewScratchForm availablePlatforms={availablePlatforms} />
        </main>
    );
}
