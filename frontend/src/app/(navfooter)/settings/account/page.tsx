import SetPageTitle from "@/components/SetPageTitle"

import Section from "../Section"

import ProfileSection from "./ProfileSection"
import UserState from "./UserState"

export default function Page() {
    return <>
        <SetPageTitle title="Account settings" />
        <Section title="Account">
            <UserState />
        </Section>
        <ProfileSection />
    </>
}
