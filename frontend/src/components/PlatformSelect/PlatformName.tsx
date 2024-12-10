import Link from "next/link";

import useSWRImmutable from "swr/immutable";

import * as api from "@/lib/api";

export type Props = {
    platform: string;
};

export default function PlatformName({ platform }: Props) {
    const { data } = useSWRImmutable<api.PlatformBase>(
        `/platform/${platform}`,
        api.get,
    );

    return (
        <>
            <Link href={`/platform/${platform}`}>{data?.name ?? platform}</Link>
        </>
    );
}
