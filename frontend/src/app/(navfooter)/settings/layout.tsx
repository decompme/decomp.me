import {
    FileIcon,
    PaintbrushIcon,
    GearIcon,
    SparklesFillIcon,
} from "@primer/octicons-react";

import NavItem from "./NavItem";

export default function Layout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="mx-auto flex w-full max-w-screen-lg flex-col lg:flex-row">
            <aside className="mx-auto w-full max-w-screen-md border-gray-6 border-b p-1 lg:w-1/4 lg:border-b-0 lg:p-6">
                <nav aria-label="Settings">
                    <ul className="flex flex-wrap gap-1 lg:flex-col">
                        <NavItem
                            segment="account"
                            label="Account"
                            icon={<GearIcon />}
                        />
                        <NavItem
                            segment="appearance"
                            label="Appearance"
                            icon={<PaintbrushIcon />}
                        />
                        <NavItem
                            segment="editor"
                            label="Editor"
                            icon={<FileIcon />}
                        />
                        <NavItem
                            segment="ai"
                            label="AI"
                            icon={<SparklesFillIcon />}
                        />
                    </ul>
                </nav>
            </aside>
            <main className="mx-auto w-full max-w-screen-md p-6 lg:w-3/4">
                {children}
            </main>
        </div>
    );
}
