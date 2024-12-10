import Link from "next/link";

import type * as api from "@/lib/api";
import { platformUrl } from "@/lib/api/urls";

import { platformIcon } from "./PlatformSelect/PlatformIcon";

export type Props = {
    scratch: api.TerseScratch;
    size: number;
    className?: string;
};

export default function PlatformLink(props: Props) {
    const Icon = platformIcon(props.scratch.platform);

    return (
        <Link href={platformUrl(props.scratch.platform)}>
            <Icon
                width={props.size}
                height={props.size}
                className={props.className}
            />
        </Link>
    );
}
