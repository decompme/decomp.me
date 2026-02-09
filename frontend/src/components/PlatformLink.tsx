import Link from "next/link";

import { platformUrl } from "@/lib/api/urls";

import { platformIcon } from "./PlatformSelect/PlatformIcon";

export type Props = {
    platform: string;
    size: number;
    className?: string;
};

export default function PlatformLink(props: Props) {
    const Icon = platformIcon(props.platform);

    return (
        <Link href={platformUrl(props.platform)} prefetch={false}>
            <Icon
                width={props.size}
                height={props.size}
                className={props.className}
            />
        </Link>
    );
}
