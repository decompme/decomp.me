import { useState } from "react"

import { ComponentStory, ComponentMeta } from "@storybook/react"

import Select from "./Select2"

export default {
    title: "Select",
    component: Select,
} as ComponentMeta<typeof Select>

const Template: ComponentStory<typeof Select> = args => {
    const [value, setValue] = useState<string>(args.value)

    return <div>
        <Select {...args} value={value} onChange={setValue} />
        <br />
        value: {value}
    </div>
}

export const Default: ComponentStory<typeof Select> = Template.bind({})
Default.args = {
    value: "initial",
    options: {
        "above": "Above",
        "initial": "Initial value",
        "below": "Below",
    },
}
