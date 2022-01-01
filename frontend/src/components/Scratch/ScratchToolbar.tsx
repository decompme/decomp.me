import { useEffect, useRef, useState } from "react"

import { ThreeBarsIcon } from "@primer/octicons-react"
import ContentEditable from "react-contenteditable"
import { useLayer } from "react-laag"

import * as api from "../../lib/api"
import PlatformIcon from "../PlatformSelect/PlatformIcon"
import VerticalMenu, { ButtonItem, LinkItem } from "../VerticalMenu"

import ClaimScratchButton from "./buttons/ClaimScratchButton"
import CompileScratchButton from "./buttons/CompileScratchButton"
import ForkScratchButton from "./buttons/ForkScratchButton"
import SaveScratchButton from "./buttons/SaveScratchButton"
import styles from "./ScratchToolbar.module.scss"

// Prevents XSS
function htmlTextOnly(html: string): string {
    return html.replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

function ScratchName({ name, onChange }: { name: string, onChange?: (name: string) => void }) {
    const [isEditing, setEditing] = useState(false)
    const editableRef = useRef<HTMLDivElement>()

    useEffect(() => {
        const el = editableRef.current

        if (el) {
            const range = document.createRange()
            range.selectNodeContents(el)
            const sel = window.getSelection()
            sel.removeAllRanges()
            sel.addRange(range)
        }
    }, [isEditing])

    if (isEditing) {
        return <ContentEditable
            innerRef={editableRef}
            tagName="div"
            html={htmlTextOnly(name)}
            spellCheck={false}
            className={styles.name}

            onChange={evt => {
                const name = evt.target.value
                if (name.length != 0)
                    onChange(name)
            }}

            onPaste={evt => {
                // Only allow pasting text, rather than any HTML. This is redundant due
                // to htmlTextOnly but it's nice not to show "<img>" when you paste an image.

                evt.preventDefault()
                const text = evt.clipboardData.getData("text")

                // note: we're using document.execCommand, which is deprecated,
                // but its no big deal if it doesn't work.
                document.execCommand("insertText", false, text)
            }}

            onBlur={() => setEditing(false)}
        />
    } else {
        return <div
            className={styles.name}
            onClick={() => {
                if (onChange)
                    setEditing(true)
            }}
        >
            {name}
        </div>
    }
}

export type Props = {
    isCompiling: boolean
    compile: () => Promise<void>
    scratch: Readonly<api.Scratch>
    setScratch: (scratch: Partial<api.Scratch>) => void
}

export default function ScratchToolbar({
    isCompiling, compile, scratch, setScratch,
}: Props) {
    const userIsYou = api.useUserIsYou()
    const isSSR = typeof window === "undefined"
    const forkScratch = api.useForkScratchAndGo(scratch)
    const saveScratch = api.useSaveScratch(scratch)

    const [isMenuOpen, setMenuOpen] = useState(false)
    const { renderLayer, triggerProps, layerProps } = useLayer({
        isOpen: isMenuOpen,
        onOutsideClick: () => setMenuOpen(false),
        overflowContainer: false,
        auto: false,
        placement: "bottom-start",
        triggerOffset: 0,
    })

    if (isSSR) {
        return <div className={styles.toolbar} />
    }

    return (
        <div className={styles.toolbar}>
            <div className={styles.left}>
                <div className={styles.menuButton} onClick={() => setMenuOpen(true)} {...triggerProps}>
                    <ThreeBarsIcon size={16} />
                </div>
                {renderLayer(<div {...layerProps}>
                    {isMenuOpen && <VerticalMenu close={() => setMenuOpen(false)}>
                        <LinkItem href="/scratch/new">New scratch...</LinkItem>
                        <hr />
                        {!scratch.owner && <ButtonItem onClick={() => api.claimScratch(scratch)}>Claim</ButtonItem>}
                        <ButtonItem onClick={saveScratch} disabled={userIsYou(scratch.owner)}>Save</ButtonItem>
                        <ButtonItem onClick={forkScratch}>Fork</ButtonItem>
                        <hr />
                        <ButtonItem disabled onClick={() => /* TODO */ undefined}>Export as...</ButtonItem>
                        <hr />
                        <LinkItem href="/credits">Credits</LinkItem>
                        <LinkItem href="https://github.com/decompme/decomp.me">Contribute to decomp.me</LinkItem>
                        <LinkItem href="https://discord.gg/sutqNShRRs">Join the Discord server</LinkItem>
                    </VerticalMenu>}
                </div>)}
            </div>
            <div className={styles.center}>
                <div className={styles.icons}>
                    <PlatformIcon size={20} platform={scratch.platform} />
                </div>
                <ScratchName
                    name={scratch.name}
                    onChange={userIsYou(scratch.owner) && (name => setScratch({ name }))}
                />
            </div>
            <div className={styles.right}>
                <CompileScratchButton compile={compile} isCompiling={isCompiling} />
                {userIsYou(scratch.owner) && <SaveScratchButton compile={compile} scratch={scratch} />}
                {!scratch.owner && <ClaimScratchButton scratch={scratch} />}
                {scratch.owner && !userIsYou(scratch.owner) && <ForkScratchButton scratch={scratch} />}
            </div>
        </div>
    )
}
