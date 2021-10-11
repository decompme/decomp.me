import { ComponentStory, ComponentMeta } from "@storybook/react"

import Editor from "./Editor"

export default {
    title: "scratch/Editor",
    component: Editor,
} as ComponentMeta<typeof Editor>

const Template: ComponentStory<typeof Editor> = args => {
    return <div style={{ display: "flex", height: "400px" }}>
        <Editor {...args} />
    </div>
}

export const C: ComponentStory<typeof Editor> = Template.bind({})
C.args = {
    language: "c",
    value: "// ...\n"
}

export const Asm: ComponentStory<typeof Editor> = Template.bind({})
Asm.args = {
    language: "asm",
    value: "jr $ra\nnop\n"
}

