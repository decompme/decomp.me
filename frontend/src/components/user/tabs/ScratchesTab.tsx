import ScratchList from "@/components/ScratchList";
import { ScratchItemNoOwner } from "@/components/ScratchItem";

import { type User, useThisUserIsAdmin, useUserIsYou } from "@/lib/api";
import type { PlatformBase } from "@/lib/api/types";
import { userUrl } from "@/lib/api/urls";

export default function ScratchesTab({
    user,
    availablePlatforms,
}: {
    user: User;
    availablePlatforms: Record<string, PlatformBase>;
}) {
    const userIsYou = useUserIsYou();
    const isAdmin = useThisUserIsAdmin();

    return (
        <section className="mt-4">
            <ScratchList
                url={`${userUrl(user)}/scratches?page_size=20`}
                item={ScratchItemNoOwner}
                isSortable={true}
                availablePlatforms={availablePlatforms}
                showDeleteButtons={userIsYou(user) || isAdmin}
            />
        </section>
    );
}
