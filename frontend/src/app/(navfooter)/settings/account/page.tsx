import Section from "../Section"

import ProfileSection from "./ProfileSection"
import UserState from "./UserState"

export const metadata = {
    title: "Account settings - decomp.me",
}

export default function Page() {
    return <>
        <Section title="Account">
            <UserState />
        </Section>
        <ProfileSection />
    </>
}
