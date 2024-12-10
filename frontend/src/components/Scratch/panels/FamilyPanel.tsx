import dynamic from "next/dynamic";

import Loading from "@/components/loading.svg";
import type { TerseScratch } from "@/lib/api/types";

const SortableFamilyList = dynamic(
    () => import("@/components/Scratch/SortableFamilyList"),
    {
        loading: () => (
            <div className="flex size-full items-center justify-center">
                <Loading className="size-8 animate-pulse" />
            </div>
        ),
    },
);

type Props = {
    scratch: TerseScratch;
};

export default function FamilyPanel({ scratch }: Props) {
    return (
        <div className="h-full overflow-auto p-4">
            <SortableFamilyList scratch={scratch} />
        </div>
    );
}
