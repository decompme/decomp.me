import { init, captureRouterTransitionStart } from "@sentry/nextjs";

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

const isSentryEnabled = !!SENTRY_DSN;

if (isSentryEnabled) {
    init({
        dsn: SENTRY_DSN,

        tracesSampleRate: Number.parseFloat(
            process.env.NEXT_PUBLIC_SENTRY_CLIENT_SAMPLE_RATE ?? "0.1",
        ),

        debug: false,
    });
} else {
    console.log("Sentry is disabled on the client.");
}

// If Sentry is not initialized, this function will be a no-op
export const onRouterTransitionStart = isSentryEnabled
    ? captureRouterTransitionStart
    : () => {};
