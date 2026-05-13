import NextLink from "next/link";
import {
    forwardRef,
    type ComponentPropsWithoutRef,
    type ElementRef,
} from "react";

export type Props = ComponentPropsWithoutRef<typeof NextLink>;

const Link = forwardRef<ElementRef<typeof NextLink>, Props>(function Link(
    { prefetch = false, ...props },
    ref,
) {
    return <NextLink ref={ref} prefetch={prefetch} {...props} />;
});

export default Link;
