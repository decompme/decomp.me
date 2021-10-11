import { Toaster } from "react-hot-toast"

export default function Layout({ children }: { children: React.ReactNode }) {
    return <>
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
    </>
}
