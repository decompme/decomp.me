import { ComponentStory, ComponentMeta } from "@storybook/react"

import CompilerOpts from "./CompilerOpts"

export default {
    title: "compiler/CompilerOpts",
    component: CompilerOpts,
} as ComponentMeta<typeof CompilerOpts>

const Template: ComponentStory<typeof CompilerOpts> = args => {
    return <CompilerOpts {...args} />
}

export const AnyArch: ComponentStory<typeof CompilerOpts> = Template.bind({})
AnyArch.args = {
}

export const MipsCompilersOnly: ComponentStory<typeof CompilerOpts> = Template.bind({})
MipsCompilersOnly.args = {
    arch: "mips",
}

