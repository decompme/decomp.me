import useSWRImmutable from "swr/immutable";
import Link from "@/components/Link";

import * as api from "@/lib/api";

export type Props = {
    platform: string;
};

export default function PlatformName({ platform }: Props) {
    const { data } = useSWRImmutable<api.PlatformBase>(
        `/platform/${platform}`,
        api.getPublic,
    );

    return <Link href={`/platform/${platform}`}>{data?.name ?? platform}</Link>;
}
