import { h, Fragment } from "preact"
import { MiscCheckbox } from "../ArchOpts"

export const name = "mips"
export const id = "mips"

export function Flags() {
    return <>
        <MiscCheckbox flag=".set noreorder" description="Prevent the assembler from re-ordering instructions" />
    </>
}
