import { Presets } from "@/app/(navfooter)/preset/presets";
import { getPublic } from "@/lib/api/request";

export const dynamic = "force-dynamic";

export default async function Page() {
    const { platforms: availablePlatforms } = await getPublic("/compilers");

    return (
        <main className="mx-auto w-full max-w-3xl p-4">
            <Presets availablePlatforms={availablePlatforms} />
        </main>
    );
}
