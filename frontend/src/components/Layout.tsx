import { Toaster } from "react-hot-toast"

import ErrorBoundary from "./ErrorBoundary"

export default function Layout({ children }: { children: React.ReactNode }) {
    return <>
        <ErrorBoundary>
            {children}
        </ErrorBoundary>

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
    </>
}
