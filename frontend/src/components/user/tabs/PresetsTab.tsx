"use client";

import { PresetList } from "@/components/PresetList";

import type { User } from "@/lib/api";
import { userUrl } from "@/lib/api/urls";

export default function PresetsTab({ user }: { user: User }) {
    return (
        <section className="mt-4">
            <PresetList url={`${userUrl(user)}/presets?page_size=20`} />
        </section>
    );
}
