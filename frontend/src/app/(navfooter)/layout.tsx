import ErrorBoundary from "@/components/ErrorBoundary";
import Footer from "@/components/Footer";
import Nav from "@/components/Nav";

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <>
            <ErrorBoundary>
                <Nav />
            </ErrorBoundary>
            {children}
            <ErrorBoundary>
                <Footer />
            </ErrorBoundary>
        </>
    );
}
