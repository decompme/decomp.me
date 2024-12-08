import type { ReactNode } from "react";

export type Props = {
    title: string;
    children: ReactNode;
};

export default function Section({ title, children }: Props) {
    return (
        <section className="mb-8">
            <h2 className="border-gray-6 border-b py-1 font-semibold text-2xl">
                {title}
            </h2>
            <div className="pt-4">{children}</div>
        </section>
    );
}
