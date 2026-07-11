import { Platforms } from "@/app/(navfooter)/platform/platforms";
import { getPublic } from "@/lib/api/request";

export const dynamic = "force-dynamic";

export default async function Page() {
    const { platforms: availablePlatforms } = await getPublic("/compilers");

    return (
        <main className="mx-auto w-full max-w-3xl p-4">
            <Platforms availablePlatforms={availablePlatforms} />
        </main>
    );
}
