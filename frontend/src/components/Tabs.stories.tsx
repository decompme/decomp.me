import { ComponentStory, ComponentMeta } from "@storybook/react"

import Tabs, { Tab } from "./Tabs"

export default {
    title: "Tabs",
    component: Tabs,
} as ComponentMeta<typeof Tabs>

export const Basic: ComponentStory<typeof Tabs> = args => {
    return <Tabs {...args}>
        <Tab tabKey="tab 1" key="Tab 1">
            Tab 1 content
        </Tab>
        <Tab tabKey="tab 2" key="Tab 2">
            Tab 2 content
        </Tab>
        <Tab tabKey="tab 3" key="Disabled tab" disabled>
            How did you get here?
        </Tab>
        <Tab tabKey="tab 4" key="Tab 4">
            Tab 4 content
        </Tab>
    </Tabs>
}
Basic.args = {
    activeTab: "Tab 2",
}
