import { DatabaseIcon, PeopleIcon } from "@primer/octicons-react";
import type { ComponentType } from "react";

import ScratchIcon from "@/components/ScratchIcon";

import type { Stats } from "@/lib/api";

type StatIcon = ComponentType<{ size?: number }>;

export type StatDefinition = {
    key: keyof Stats;
    label: string;
    Icon: StatIcon;
    width: string;
};

export const STAT_DEFINITIONS: StatDefinition[] = [
    {
        key: "scratch_count",
        label: "scratches created",
        Icon: ScratchIcon,
        width: "w-32",
    },
    {
        key: "github_user_count",
        label: "users signed up",
        Icon: PeopleIcon,
        width: "w-28",
    },
    {
        key: "asm_count",
        label: "asm globs submitted",
        Icon: DatabaseIcon,
        width: "w-36",
    },
];
