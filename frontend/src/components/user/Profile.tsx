"use client"

import { useState, ReactElement } from "react"

import { MarkGithubIcon } from "@primer/octicons-react"

import GhostButton from "@/components/GhostButton"
import Tabs, { Tab } from "@/components/Tabs"
import { User } from "@/lib/api/types"
import { userGithubHtmlUrl } from "@/lib/api/urls"

import ScratchesTab from "./tabs/ScratchesTab"
import UserAvatar from "./UserAvatar"

enum TabId {
    SCRATCHES = "user_scratches",
}

interface TabLayout {
    activeTab: string
    tabs: string[]
}

const tabLayout: TabLayout = {
    activeTab: TabId.SCRATCHES,
    tabs: [
        TabId.SCRATCHES,
    ],
}

interface Props {
    layout: TabLayout
    renderTab: (id: string) => ReactElement<typeof Tab>
    onChange: (layout: TabLayout) => void
}

function CustomLayout({ renderTab, layout, onChange }: Props) {
    const els = []

    for (const id of layout.tabs) {
        els.push(renderTab(id))
    }

    return <Tabs
        activeTab={layout.activeTab}
        onChange={activeTab => onChange({ ...layout, activeTab })}
    >
        {els}
    </Tabs>
}

export default function Profile({ user }: { user: User }) {
    const [layout, setLayout] = useState<TabLayout>(tabLayout)

    const renderTab = (id: string) => {
        switch (id as TabId) {
        case TabId.SCRATCHES:
            return <Tab key={id} tabKey={id} label="Scratches">
                {() => <ScratchesTab user={user} />}
            </Tab>
        default:
            return <Tab key={id} tabKey={id} label={id} disabled />
        }
    }

    return (
        <div className="mx-auto w-full max-w-3xl p-4">
            <header className="flex flex-col items-center gap-6 pt-4 md:flex-row">
                <UserAvatar className="size-16" user={user} />
                <div>
                    <h1 className="text-center text-2xl font-medium tracking-tight md:text-left">
                        {user.username}
                    </h1>

                    <div className="flex flex-wrap items-center justify-center gap-2 pt-1 text-sm text-gray-11 md:justify-start">
                        <GhostButton href={userGithubHtmlUrl(user)}>
                            <div className="flex items-center gap-1">
                                {userGithubHtmlUrl(user) && <MarkGithubIcon size={16} aria-label="GitHub username" />}
                                <span>{user.username}</span>
                            </div>
                        </GhostButton>
                    </div>
                </div>
            </header>

            {layout && <CustomLayout
                layout={layout}
                onChange={setLayout}
                renderTab={renderTab}
            />}
        </div>
    )
}
