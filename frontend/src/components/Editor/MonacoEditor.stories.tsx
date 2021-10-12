import { useState } from "react"

import { ComponentStory, ComponentMeta } from "@storybook/react"

import MonacoEditor from "./MonacoEditor"

export default {
    title: "MonacoEditor",
    component: MonacoEditor,
} as ComponentMeta<typeof MonacoEditor>

const Template: ComponentStory<typeof MonacoEditor> = args => {
    const [value, setValue] = useState(args.value)

    return <div style={{ display: "flex", width: "95vw", height: "95vh" }}>
        <MonacoEditor {...args} value={value} onChange={setValue} />
    </div>
}

export const C: ComponentStory<typeof MonacoEditor> = Template.bind({})
C.args = {
    language: "c",
    value:
`s32 collision_heap_free(void* data) {
    if (gGameStatusPtr->isBattle) {
        return _heap_free(&D_803DA800, data);
    } else {
        return _heap_free(&D_80268000, data);
    }
}
`,
    lineNumbers: true,
    showMargin: true,
}

export const Mips: ComponentStory<typeof MonacoEditor> = Template.bind({})
Mips.args = {
    language: "mips",
    value:
`.set noat      # allow manual use of $at
.set noreorder # don't insert nops after branches

glabel sins
/* 3F9F0 800645F0 3084FFFF */  andi      $a0, $a0, 0xffff
/* 3F9F4 800645F4 00042102 */  srl       $a0, $a0, 4
/* 3F9F8 800645F8 30820400 */  andi      $v0, $a0, 0x400
/* 3F9FC 800645FC 10400004 */  beqz      $v0, .L80064610
/* 3FA00 80064600 00802821 */   addu     $a1, $a0, $zero
/* 3FA04 80064604 00041027 */  nor       $v0, $zero, $a0
/* 3FA08 80064608 08019185 */  j         .L80064614
/* 3FA0C 8006460C 304203FF */   andi     $v0, $v0, 0x3ff
.L80064610:
/* 3FA10 80064610 308203FF */  andi      $v0, $a0, 0x3ff
.L80064614:
/* 3FA14 80064614 00021040 */  sll       $v0, $v0, 1
/* 3FA18 80064618 3C038009 */  lui       $v1, %hi(sintable)
/* 3FA1C 8006461C 00621821 */  addu      $v1, $v1, $v0
/* 3FA20 80064620 94633DE0 */  lhu       $v1, %lo(sintable)($v1)
/* 3FA24 80064624 30A20800 */  andi      $v0, $a1, 0x800
/* 3FA28 80064628 14400003 */  bnez      $v0, .L80064638
/* 3FA2C 8006462C 00031023 */   negu     $v0, $v1
/* 3FA30 80064630 0801918F */  j         .L8006463C
/* 3FA34 80064634 00031400 */   sll      $v0, $v1, 0x10
.L80064638:
/* 3FA38 80064638 00021400 */  sll       $v0, $v0, 0x10
.L8006463C:
/* 3FA3C 8006463C 03E00008 */  jr        $ra
/* 3FA40 80064640 00021403 */   sra      $v0, $v0, 0x10
/* 3FA44 80064644 00000000 */  nop
/* 3FA48 80064648 00000000 */  nop
/* 3FA4C 8006464C 00000000 */  nop
`,
}

export const OverScrollTest: ComponentStory<typeof MonacoEditor> = () => {
    const args = Mips.args
    const [value, setValue] = useState(args.value)

    return <div style={{ height: "150vh" }}>
        Page should begin scrolling after the editor hits the bottom

        <div style={{ display: "flex", width: "95vw", height: "400px" }}>
            <MonacoEditor {...args} value={value} onChange={setValue} language="mips" />
        </div>
    </div>
}

export const Readonly: ComponentStory<typeof MonacoEditor> = () => {
    const args = Mips.args

    return <div style={{ display: "flex", width: "95vw", height: "95vh" }}>
        <MonacoEditor {...args} value={args.value} language="mips" />
    </div>
}
