import { ComponentStory, ComponentMeta } from "@storybook/react"

import Tabs, { Tab } from "./Tabs"

export default {
    title: "Tabs",
    component: Tabs,
} as ComponentMeta<typeof Tabs>

export const Basic: ComponentStory<typeof Tabs> = args => {
    return <Tabs {...args}>
        <Tab key="Tab 1">
            Tab 1 content
        </Tab>
        <Tab key="Tab 2">
            Tab 2 content
        </Tab>
        <Tab key="Disabled tab" disabled>
            How did you get here?
        </Tab>
        <Tab key="Tab 4">
            Tab 4 content
        </Tab>
    </Tabs>
}
Basic.args = {
    activeTab: "Tab 2",
}
