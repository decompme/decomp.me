import React from "react"

import { BookIcon } from "@primer/octicons-react"
import { ComponentStory, ComponentMeta } from "@storybook/react"

import Button from "./Button"

export default {
    title: "Button",
    component: Button,
} as ComponentMeta<typeof Button>

const Template: ComponentStory<typeof Button> = args => <Button {...args} />

export const Default: ComponentStory<typeof Button> = Template.bind({})
Default.args = {
    children: "Button",
    primary: false,
    disabled: false,
}

export const Disabled: ComponentStory<typeof Button> = Template.bind({})
Disabled.args = {
    ...Default.args,
    disabled: true,
}

export const Primary: ComponentStory<typeof Button> = Template.bind({})
Primary.args = {
    ...Default.args,
    primary: true,
}

export const PrimaryDisabled: ComponentStory<typeof Button> = Template.bind({})
PrimaryDisabled.args = {
    ...Default.args,
    primary: true,
    disabled: true,
}

export const Icon: ComponentStory<typeof Button> = args => (
    <Button {...args}>
        <BookIcon />
        Read a book
    </Button>
)
