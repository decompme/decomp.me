import type { SVGProps } from "react";

import clsx from "clsx";

import type * as api from "@/lib/api";

import Frog from "../Nav/frog.svg";

import styles from "./AnonymousFrog.module.scss";

export type Props = SVGProps<SVGElement> & {
    user: api.AnonymousUser;
    className?: string;
};

export default function AnonymousFrogAvatar({
    user,
    className,
    ...props
}: Props) {
    const accentStyle = {
        "--accent-hue": user.frog_color[0],
        "--accent-saturation": user.frog_color[1],
        "--accent-lightness": user.frog_color[2],
    };

    return (
        <div
            className={clsx(
                className,
                "flex aspect-square items-center justify-center rounded-full bg-gray-3",
            )}
        >
            <Frog
                style={accentStyle}
                className={clsx(styles.anonymousFrog, "h-4/6 w-4/6")}
                {...props}
            />
        </div>
    );
}
