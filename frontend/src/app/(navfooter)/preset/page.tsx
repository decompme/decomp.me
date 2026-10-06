import { Presets } from "@/app/(navfooter)/preset/presets";
import CompilerServiceUnavailable from "@/components/CompilerServiceUnavailable";
import { CompilerServiceUnavailableError, getPublic } from "@/lib/api/request";

export const dynamic = "force-dynamic";

export default async function Page() {
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
        <main className="mx-auto w-full max-w-3xl p-4">
            <Presets availablePlatforms={availablePlatforms} />
        </main>
    );
}
