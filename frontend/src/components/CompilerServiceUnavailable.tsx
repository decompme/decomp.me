export default function CompilerServiceUnavailable() {
    return (
        <main className="max-w-prose p-4 md:mx-auto">
            <h1 className="py-4 font-semibold text-3xl">
                The compiler service is unavailable
            </h1>
            <p className="py-4">
                We can’t load the available platforms right now. Please try
                again shortly; if this continues, let us know on Discord.
            </p>
        </main>
    );
}
