import { Presets } from "@/app/(navfooter)/preset/presets";
import { get } from "@/lib/api/request";

export default async function Page() {
    const compilers = await get("/compiler");

    return (
        <main className="mx-auto w-full max-w-3xl p-4">
            <Presets serverCompilers={compilers} />
        </main>
    );
}
