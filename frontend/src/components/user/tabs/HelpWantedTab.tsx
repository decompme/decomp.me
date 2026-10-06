import ScratchList from "@/components/ScratchList";

import type { User } from "@/lib/api";
import { userUrl } from "@/lib/api/urls";

export default function HelpWantedTab({ user }: { user: User }) {
    return (
        <section className="mt-4">
            <ScratchList
                url={`${userUrl(user)}/help-wanted?page_size=20`}
                isSortable
            />
        </section>
    );
}
