import { Platforms } from "@/app/(navfooter)/platform/platforms";
import { get } from "@/lib/api/request";

export default async function Page() {
    const availablePlatforms = await get("/platform");

    return (
        <main className="mx-auto w-full max-w-3xl p-4">
            <Platforms availablePlatforms={availablePlatforms} />
        </main>
    );
}
