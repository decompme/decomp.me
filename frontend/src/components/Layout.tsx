import { Toaster } from "react-hot-toast"
import { SkeletonTheme } from "react-loading-skeleton"

export default function Layout({ children }: { children: React.ReactNode }) {
    return <SkeletonTheme color="#1c1e23" highlightColor="#26292d">
        {children}

        <Toaster
            position="bottom-center"
            reverseOrder={true}
            toastOptions={{
                style: {
                    borderRadius: "100px",
                    background: "#333",
                    color: "#fff",
                },
            }}
        />
    </SkeletonTheme>
}
