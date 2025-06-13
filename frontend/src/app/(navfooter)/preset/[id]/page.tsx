export const runtime = "edge";

import type { Metadata } from "next";

import { notFound } from "next/navigation";

import { PlatformIcon } from "@/components/PlatformSelect/PlatformIcon";
import ScratchList from "@/components/ScratchList";
import { ScratchItemPresetList } from "@/components/ScratchItem";
import { get } from "@/lib/api/request";
import type { Preset } from "@/lib/api/types";
import getTranslation from "@/lib/i18n/translate";

export async function generateMetadata(props: {
    params: Promise<{ id: number }>;
}): Promise<Metadata> {
    const params = await props.params;
    let preset: Preset;

    try {
        preset = await get(`/preset/${params.id}`);
    } catch (error) {
        console.error(error);
    }

    if (!preset) {
        return notFound();
    }

    let description = "There ";
    description += preset.num_scratches === 1 ? "is " : "are ";
    description +=
        preset.num_scratches === 0
            ? "currently no "
            : `${preset.num_scratches.toLocaleString("en-US")} `;
    description += preset.num_scratches === 1 ? "scratch " : "scratches ";
    description += "that use this preset.";

    return {
        title: preset.name,
        openGraph: {
            title: preset.name,
            description: description,
        },
    };
}

export default async function Page(props: { params: Promise<{ id: number }> }) {
    const params = await props.params;
    const compilersTranslation = getTranslation("compilers");

    let preset: Preset;
    try {
        preset = await get(`/preset/${params.id}`);
    } catch (error) {
        console.error(error);
    }

    if (!preset) {
        return notFound();
    }

    const compilerName = compilersTranslation.t(preset.compiler);

    return (
        <main className="mx-auto w-full max-w-3xl p-4">
            <div className="flex items-center gap-2 font-medium text-2xl">
                <PlatformIcon platform={preset.platform} size={32} />
                <h1>{preset.name}</h1>
            </div>
            <p className="py-3 text-gray-11">{compilerName}</p>

            <section>
                <ScratchList
                    url={`/scratch?preset=${preset.id}&page_size=20`}
                    item={ScratchItemPresetList}
                    isSortable={true}
                    title={`Scratches (${preset.num_scratches.toLocaleString("en-US")})`}
                />
            </section>
        </main>
    );
}
