export const runtime = "edge";

import { Presets } from "@/app/(navfooter)/preset/presets";
import { get } from "@/lib/api/request";

export default async function Page() {
    const availablePlatforms = await get("/platform");

    return (
        <main className="mx-auto w-full max-w-3xl p-4">
            <Presets availablePlatforms={availablePlatforms} />
        </main>
    );
}
