import { useEffect, useRef, useState } from "react"

import { DownloadIcon, GearIcon, HomeIcon, MarkGithubIcon, PeopleIcon, PlusIcon, RepoForkedIcon, SyncIcon, TrashIcon, TriangleDownIcon, UploadIcon } from "@primer/octicons-react"
import classNames from "classnames"
import { usePlausible } from "next-plausible"
import ContentEditable from "react-contenteditable"
import { useLayer } from "react-laag"

import * as api from "../../lib/api"
import DiscordIcon from "../discord.svg"
import Frog from "../Nav/frog.svg"
import LoginState from "../Nav/LoginState"
import Search from "../Nav/Search"
import PlatformIcon from "../PlatformSelect/PlatformIcon"
import { SpecialKey } from "../Shortcut"
import VerticalMenu, { ButtonItem, LinkItem } from "../VerticalMenu"

import ClaimScratchButton from "./buttons/ClaimScratchButton"
import CompileScratchButton from "./buttons/CompileScratchButton"
import ForkScratchButton from "./buttons/ForkScratchButton"
import SaveScratchButton from "./buttons/SaveScratchButton"
import useFuzzySaveCallback, { FuzzySaveAction } from "./hooks/useFuzzySaveCallback"
import ScratchDecompileModal from "./ScratchDecompileModal"
import ScratchPreferencesModal from "./ScratchPreferencesModal"
import styles from "./ScratchToolbar.module.scss"

// Prevents XSS
function htmlTextOnly(html: string): string {
    return html.replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

function exportScratchZip(scratch: api.Scratch) {
    const url = api.getURL(`${scratch.url}/export`)
    const a = document.createElement("a")
    a.href = url
    a.download = scratch.name + ".zip"
    a.click()
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
                const name = evt.currentTarget.innerText as string
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

            onKeyDown={evt => {
                if (evt.key === "Enter") {
                    evt.preventDefault()
                    setEditing(false)
                }
            }}
        />
    } else {
        return <div
            className={classNames(styles.name, { [styles.editable]: !!onChange })}
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
    const forkScratch = api.useForkScratchAndGo(scratch)
    const [fuzzySaveAction, fuzzySaveScratch] = useFuzzySaveCallback(scratch, setScratch)
    const [isSaving, setIsSaving] = useState(false)
    const plausible = usePlausible()

    const [isMenuOpen, setMenuOpen] = useState(false)
    const { renderLayer, triggerProps, layerProps } = useLayer({
        isOpen: isMenuOpen,
        onOutsideClick: () => setMenuOpen(false),
        overflowContainer: false,
        auto: false,
        placement: "bottom-start",
        triggerOffset: 4,
    })

    const [isPreferencesOpen, setPreferencesOpen] = useState(false)
    const [isDecompileOpen, setDecompileOpen] = useState(false)

    const [isMounted, setMounted] = useState(false)
    useEffect(() => setMounted(true), [])

    return (
        <div className={styles.toolbar}>
            <div className={styles.left}>
                <div className={styles.iconButton} onClick={() => setMenuOpen(!isMenuOpen)} {...triggerProps}>
                    <Frog width={32} height={32} />
                    <TriangleDownIcon />
                </div>
                {isMounted && renderLayer(<div {...layerProps}>
                    <VerticalMenu open={isMenuOpen} setOpen={setMenuOpen}>
                        <LinkItem href="/">
                            <HomeIcon />
                            Home
                        </LinkItem>
                        <LinkItem href="/new">
                            <PlusIcon />
                            New scratch...
                        </LinkItem>
                        <hr />
                        {!scratch.owner && <ButtonItem
                            onTrigger={() => api.claimScratch(scratch)}
                            shortcutKeys={fuzzySaveAction === FuzzySaveAction.CLAIM && [SpecialKey.CTRL_COMMAND, "S"]}
                        >
                            Claim
                        </ButtonItem>
                        }
                        <ButtonItem
                            onTrigger={async () => {
                                setIsSaving(true)
                                await fuzzySaveScratch()
                                setIsSaving(false)
                            }}
                            disabled={scratch.owner && !userIsYou(scratch.owner)}
                            shortcutKeys={
                                (fuzzySaveAction === FuzzySaveAction.SAVE || fuzzySaveAction === FuzzySaveAction.NONE)
                                && [SpecialKey.CTRL_COMMAND, "S"]
                            }
                        >
                            <UploadIcon />
                            Save
                        </ButtonItem>
                        <ButtonItem
                            onTrigger={forkScratch}
                            shortcutKeys={fuzzySaveAction === FuzzySaveAction.FORK && [SpecialKey.CTRL_COMMAND, "S"]}
                        >
                            <RepoForkedIcon />
                            Fork
                        </ButtonItem>
                        <ButtonItem
                            onTrigger={compile}
                            shortcutKeys={[SpecialKey.CTRL_COMMAND, "J"]}
                        >
                            <SyncIcon />
                            Compile
                        </ButtonItem>
                        <hr />
                        <ButtonItem onTrigger={() => {
                            plausible("exportScratchZip", { props: { scratch: scratch.html_url } })
                            exportScratchZip(scratch)
                        }}>
                            <DownloadIcon />
                            Export as ZIP...
                        </ButtonItem>
                        <ButtonItem onTrigger={() => setDecompileOpen(true)}>
                            <TrashIcon />
                            Reset source code...
                        </ButtonItem>
                        <hr />
                        <ButtonItem onTrigger={() => setPreferencesOpen(true)} shortcutKeys={[SpecialKey.CTRL_COMMAND, ","]}>
                            <GearIcon />
                            Preferences...
                        </ButtonItem>
                        <hr />
                        <LinkItem href="https://github.com/decompme/decomp.me">
                            <MarkGithubIcon />
                            Contribute to decomp.me
                        </LinkItem>
                        <LinkItem href="https://discord.gg/sutqNShRRs">
                            <DiscordIcon width={16} height={16} />
                            Join the Discord server
                        </LinkItem>
                        <LinkItem href="/credits">
                            <PeopleIcon /> Credits
                        </LinkItem>
                    </VerticalMenu>
                </div>)}
                <Search className={styles.search} />
            </div>
            <div className={styles.grow} />
            <div className={styles.center}>
                <div className={styles.icons}>
                    <PlatformIcon size={20} platform={scratch.platform} />
                </div>
                <ScratchName
                    name={scratch.name}
                    onChange={userIsYou(scratch.owner) && (name => setScratch({ name }))}
                />
            </div>
            <div className={styles.grow} />
            <div className={styles.right}>
                <div className={styles.grow} />
                <div className={styles.iconButton} onClick={() => setPreferencesOpen(true)}>
                    <GearIcon size={16} />
                </div>
                {isMounted && <>
                    {<CompileScratchButton compile={compile} isCompiling={isCompiling} />}
                    {userIsYou(scratch.owner) && <SaveScratchButton compile={compile} scratch={scratch} setScratch={setScratch} isSaving={isSaving} />}
                    {!scratch.owner && <ClaimScratchButton scratch={scratch} />}
                    {scratch.owner && !userIsYou(scratch.owner) && <ForkScratchButton scratch={scratch} />}
                    <LoginState className={styles.loginState} />
                </>}
            </div>
            <ScratchPreferencesModal open={isPreferencesOpen} onClose={() => setPreferencesOpen(false)} />
            <ScratchDecompileModal
                open={isDecompileOpen}
                onClose={() => setDecompileOpen(false)}
                scratch={scratch}
                setSourceCode={source_code => setScratch({ source_code })}
            />
        </div>
    )
}
