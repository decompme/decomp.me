import { init } from "@sentry/nextjs";

const isSentryEnabled = !!process.env.NEXT_PUBLIC_SENTRY_DSN;

if (isSentryEnabled) {
    init({
        dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
        tracesSampleRate: Number.parseFloat(
            process.env.NEXT_PUBLIC_SENTRY_SERVER_SAMPLE_RATE ?? "0.1",
        ),
        debug: false,
    });
} else {
    console.log("Sentry is disabled.");
}
