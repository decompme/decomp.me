import ScratchList from "@/components/ScratchList";
import { ScratchItemNoOwner } from "@/components/ScratchItem";

import { type User, useUserIsYou, useThisUserIsAdmin } from "@/lib/api";
import { userUrl } from "@/lib/api/urls";

export default function ScratchesTab({ user }: { user: User }) {
    const userIsYou = useUserIsYou();
    const isAdmin = useThisUserIsAdmin();

    return (
        <section className="mt-4">
            <ScratchList
                url={`${userUrl(user)}/scratches?page_size=20`}
                item={ScratchItemNoOwner}
                isSortable={true}
                showDeleteButtons={userIsYou(user) || isAdmin}
            />
        </section>
    );
}
