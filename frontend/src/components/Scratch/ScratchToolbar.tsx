import { useEffect, useRef, useState } from "react"

import { DownloadIcon, RepoForkedIcon, SyncIcon, TrashIcon, UploadIcon } from "@primer/octicons-react"
import classNames from "classnames"
import ContentEditable from "react-contenteditable"

import * as api from "../../lib/api"
import Breadcrumbs from "../Breadcrumbs"
import Nav from "../Nav"
import { SpecialKey, useShortcut } from "../Shortcut"
import UserAvatar from "../user/UserAvatar"

import ClaimScratchButton from "./buttons/ClaimScratchButton"
import useFuzzySaveCallback, { FuzzySaveAction } from "./hooks/useFuzzySaveCallback"
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

async function deleteScratch(scratch: api.Scratch) {
    await api.delete_(scratch.url, {})

    window.location.href = scratch.project ? `/${scratch.project}` : "/"
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

    const [isMounted, setMounted] = useState(false)
    useEffect(() => setMounted(true), [])

    const fuzzyShortcut = useShortcut([SpecialKey.CTRL_COMMAND, "S"], async () => {
        setIsSaving(true)
        await fuzzySaveScratch()
        setIsSaving(false)
    })

    const compileShortcut = useShortcut([SpecialKey.CTRL_COMMAND, "J"], () => {
        compile()
    })

    return <>
        <Nav>
            <div className={styles.toolbar}>
                <Breadcrumbs className={styles.breadcrumbs} pages={[
                    scratch.owner && {
                        label: <>
                            <UserAvatar user={scratch.owner} />
                            <span style={{ marginLeft: "6px" }} />
                            {scratch.owner.username}
                        </>,
                        href: !scratch.owner.is_anonymous && `/u/${scratch.owner.username}`,
                    },
                    {
                        label: <ScratchName
                            name={scratch.name}
                            onChange={userIsYou(scratch.owner) && (name => setScratch({ name }))}
                        />,
                    },
                ].filter(Boolean)} />
                <div className={styles.grow} />
                <div className={styles.right}>
                    {isMounted && <>
                        {fuzzySaveAction === FuzzySaveAction.CLAIM && <ClaimScratchButton scratch={scratch} />}
                    </>}
                </div>
            </div>
        </Nav>

        <ul className={styles.actions}>
            {scratch.owner && userIsYou(scratch.owner) && <li>
                <button
                    onClick={async () => {
                        setIsSaving(true)
                        await fuzzySaveScratch()
                        setIsSaving(false)
                    }}
                    disabled={isSaving}
                    title={fuzzyShortcut}
                >
                    <UploadIcon />
                    Save
                </button>
            </li>}
            <li>
                <button
                    onClick={forkScratch}
                    title={fuzzySaveAction === FuzzySaveAction.FORK ? fuzzyShortcut : undefined}
                >
                    <RepoForkedIcon />
                    Fork
                </button>
            </li>
            {scratch.owner && userIsYou(scratch.owner) && <li>
                <button onClick={event => {
                    if (event.shiftKey || confirm("Are you sure you want to delete this scratch? This action cannot be undone.")) {
                        deleteScratch(scratch)
                    }
                }}>
                    <TrashIcon />
                    Delete
                </button>
            </li>}
            <li>
                <button
                    onClick={compile}
                    title={compileShortcut}
                    disabled={isCompiling}
                >
                    <SyncIcon />
                    Compile
                </button>
            </li>
            <li className={styles.separator} />
            <li>
                <button onClick={() => exportScratchZip(scratch)}>
                    <DownloadIcon />
                    Export..
                </button>
            </li>
        </ul>
    </>
}
