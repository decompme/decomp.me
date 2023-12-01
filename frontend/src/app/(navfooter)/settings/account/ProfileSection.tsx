"use client"

import { LinkExternalIcon } from "@primer/octicons-react"

import Button from "@/components/Button"
import GhostButton from "@/components/GhostButton"
import { useThisUser, isAnonUser } from "@/lib/api"
import { userHtmlUrl } from "@/lib/api/urls"

import Section from "../Section"

export default function ProfileSection() {
    const user = useThisUser()

    // No profile section for anonymous users
    if (!user || isAnonUser(user)) {
        return null
    }

    return <Section title="Profile">
        <p>
            Your name and profile picture are controlled by your GitHub account.
        </p>
        <div className="flex items-center gap-2 py-4">
            <Button href="https://github.com/settings/profile">
                Edit on GitHub
                <LinkExternalIcon />
            </Button>
            <GhostButton href={userHtmlUrl(user)}>View decomp.me profile</GhostButton>
        </div>
    </Section>
}
