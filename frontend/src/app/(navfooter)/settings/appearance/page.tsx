import dynamic from "next/dynamic";

const AppearanceSettings = dynamic(() => import("./AppearanceSettings"), {
    ssr: false,
});

export const metadata = {
    title: "Appearance settings",
};

export default function Page() {
    return (
        <>
            <AppearanceSettings />
        </>
    );
}
