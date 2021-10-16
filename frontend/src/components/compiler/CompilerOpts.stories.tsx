import { ComponentStory, ComponentMeta } from "@storybook/react"

import CompilerOpts from "./CompilerOpts"

export default {
    title: "compiler/CompilerOpts",
    component: CompilerOpts,
} as ComponentMeta<typeof CompilerOpts>

const Template: ComponentStory<typeof CompilerOpts> = args => {
    return <CompilerOpts {...args} />
}

export const AnyPlatform: ComponentStory<typeof CompilerOpts> = Template.bind({})
AnyPlatform.args = {
}

export const N64CompilersOnly: ComponentStory<typeof CompilerOpts> = Template.bind({})
N64CompilersOnly.args = {
    platform: "n64",
}
