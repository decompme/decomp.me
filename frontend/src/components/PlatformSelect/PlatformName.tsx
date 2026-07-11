import Link from "@/components/Link";

import * as api from "@/lib/api";

export type Props = {
    platform: string;
};

export default function PlatformName({ platform }: Props) {
    const data = api.usePlatform(platform);

    return (
        <>
            <Link href={`/platform/${platform}`}>{data?.name ?? platform}</Link>
        </>
    );
}
