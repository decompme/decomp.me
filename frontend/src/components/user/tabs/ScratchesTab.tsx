import ScratchList, { ScratchItemNoOwner } from "@/components/ScratchList";
import type { User } from "@/lib/api";
import { userUrl } from "@/lib/api/urls";

export default function ScratchesTab({ user }: { user: User }) {
    return (
        <section className="mt-4">
            <ScratchList
                url={`${userUrl(user)}/scratches?page_size=20`}
                item={ScratchItemNoOwner}
                isSortable={true}
            />
        </section>
    );
}
