import ErrorBoundary from "./ErrorBoundary"

export default function Layout({ children }: { children: React.ReactNode }) {
    return <>
        <ErrorBoundary>
            {children}
        </ErrorBoundary>
    </>
}
