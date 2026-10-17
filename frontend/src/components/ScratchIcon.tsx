import type { SVGProps } from "react";

export default function ScratchIcon({
    size = 16,
    style,
    ...props
}: SVGProps<SVGSVGElement> & { size?: number }) {
    // Octicons switch to their 24px artwork from 24px up, where a 1.5px stroke
    // is proportionally thinner. Match that so the icon keeps the same visual
    // weight as its neighbours when rendered larger.
    const strokeWidth = size >= 24 ? 1 : 1.5;
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 16 16"
            width={size}
            height={size}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            overflow="visible"
            focusable="false"
            aria-hidden="true"
            style={{ verticalAlign: "text-bottom", ...style }}
            {...props}
        >
            {/* Isometric upper rim, 2:1 slopes on a quarter grid */}
            <path d="M8 2.25 14.5 5.5 8 8.75 1.5 5.5Z" />
            {/* Deep outside walls; side walls sit on half-pixels so their strokes stay crisp */}
            <path d="M1.5 5.5v5l6.5 3.25 6.5-3.25V5.5" />
            {/* A single rising sand arc, meeting the midpoint of each front wall top edge */}
            <path d="M4.75 7.125C6.5 4.5 9.5 4.5 11.25 7.125" />
        </svg>
    );
}
