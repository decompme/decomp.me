import React from "react"

import { ComponentStory, ComponentMeta } from "@storybook/react"

import AsyncButton from "./AsyncButton"

export default {
    title: "AsyncButton",
    component: AsyncButton,
} as ComponentMeta<typeof AsyncButton>

const Template: ComponentStory<typeof AsyncButton> = args => <AsyncButton {...args} />

export const Success: ComponentStory<typeof AsyncButton> = Template.bind({})
Success.args = {
    children: "Click me",
    forceLoading: false,
    errorPlacement: "right-center",
    onClick: () => new Promise(resolve => setTimeout(() => resolve(undefined), 500)),
}

export const Loading: ComponentStory<typeof AsyncButton> = Template.bind({})
Loading.args = {
    ...Success.args,
    forceLoading: true,
}

export const Error: ComponentStory<typeof AsyncButton> = Template.bind({})
Error.args = {
    children: "Click me",
    forceLoading: false,
    errorPlacement: "right-center",
    onClick: () => new Promise((_resolve, reject) => setTimeout(() => reject("I am error"), 500)),
}
