import dynamic from "next/dynamic";

const EditorSettings = dynamic(() => import("./EditorSettings"), {
    ssr: false,
});

export const metadata = {
    title: "Editor settings",
};

export default function Page() {
    return (
        <>
            <EditorSettings />
        </>
    );
}
