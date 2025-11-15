import { headers } from "next/headers";
import Link from "next/link";

import { ArrowRightIcon } from "@primer/octicons-react";

import Button from "@/components/Button";
import GitHubLoginButton from "@/components/GitHubLoginButton";
import ScrollingPlatformIcons from "@/components/PlatformSelect/ScrollingPlatformIcons";

import SiteStats from "./SiteStats";

export const SITE_DESCRIPTION =
    "A collaborative reverse-engineering platform for working on decompilation projects with others to learn about how your favorite games work.";

export default async function WelcomeInfo() {
    const headersResult = await headers();
    const saveDataEnabled = headersResult.get("Save-Data") === "on";

    return (
        <div className="relative overflow-x-hidden p-2">
            {!saveDataEnabled && (
                <div className="-z-10 absolute top-14 hidden w-full opacity-80 sm:block">
                    <ScrollingPlatformIcons />
                    <div
                        className="absolute top-0 size-full"
                        style={{
                            // Gradient to only show icons in the middle
                            background:
                                "linear-gradient(to right, transparent, hsl(var(--color-mauve1)) 40%, hsl(var(--color-mauve1)) 60%, transparent)",
                        }}
                    />
                </div>
            )}
            <div className="text-center text-lg">
                <h1
                    className="mx-auto w-full max-w-lg font-extrabold text-4xl text-gray-12 !md:leading-[0.8] md:max-w-3xl md:text-6xl"
                    style={{
                        // Shadow to make text more readable on the background
                        textShadow:
                            "0 1px 0.3rem hsl(var(--color-mauve10) / 0.4)",
                    }}
                >
                    Collaboratively decompile code in your browser.
                </h1>
                <p className="mx-auto my-6 w-full max-w-screen-sm text-gray-11 leading-tight">
                    {SITE_DESCRIPTION}
                </p>
                <div className="flex flex-col items-center justify-center gap-2 md:flex-row">
                    <Link href="/new">
                        <Button primary>
                            Start decomping
                            <ArrowRightIcon />
                        </Button>
                    </Link>
                    <GitHubLoginButton />
                </div>
                <p className="mx-auto my-6 w-full max-w-screen-sm text-gray-11 text-sm leading-tight">
                    Alternatively, check out existing scratches filtered by{" "}
                    <Link className="font-bold" href="/platform">
                        platform
                    </Link>{" "}
                    or{" "}
                    <Link className="font-bold" href="/preset">
                        preset
                    </Link>
                    .
                </p>
                <div className="mt-6 hidden sm:block">
                    <SiteStats />
                </div>
            </div>
        </div>
    );
}
