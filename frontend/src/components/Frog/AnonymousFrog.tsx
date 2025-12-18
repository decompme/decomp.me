import type { SVGProps } from "react";
import clsx from "clsx";
import type * as api from "@/lib/api";

import Frog from "./Frog";

export type Props = SVGProps<SVGElement> & {
    user: api.AnonymousUser;
    className?: string;
};

export default function AnonymousFrogAvatar({
    user,
    className,
    ...props
}: Props) {
    const [hue, saturation, lightness] = user.frog_color;

    const primary = `hsl(${hue}, ${saturation * 100}%, ${lightness * 100}%)`;
    const secondary = `hsl(${hue}, ${(0.3 * (1 - saturation) + saturation) * 100}%, ${(0.5 * (1 - lightness) + lightness) * 100}%)`;
    const nose = `hsl(${hue}, ${(saturation - 0.2 * saturation) * 100}%, ${(lightness - 0.4 * lightness) * 100}%)`;

    return (
        <div
            className={clsx(
                className,
                "flex aspect-square items-center justify-center rounded-full bg-gray-3",
            )}
        >
            <Frog
                primary={primary}
                secondary={secondary}
                nose={nose}
                className="h-4/6 w-4/6"
                {...props}
            />
        </div>
    );
}
