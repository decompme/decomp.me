import ScratchList from "@/components/ScratchList";
import { ScratchItemNoOwner } from "@/components/ScratchItem";

import {
    getPublic,
    type User,
    useThisUserIsAdmin,
    useUserIsYou,
} from "@/lib/api";
import type { PlatformBase } from "@/lib/api/types";
import { userUrl } from "@/lib/api/urls";
import useSWRImmutable from "swr/immutable";

export default function ScratchesTab({ user }: { user: User }) {
    const userIsYou = useUserIsYou();
    const isAdmin = useThisUserIsAdmin();
    const { data: availablePlatforms } = useSWRImmutable<
        Record<string, PlatformBase>
    >("/platform", getPublic);

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
