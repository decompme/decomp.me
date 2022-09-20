import { useEffect, useRef, useState } from "react"

import Link from "next/link"

import { DownloadIcon, FileIcon, IterationsIcon, RepoForkedIcon, SyncIcon, TrashIcon, UploadIcon } from "@primer/octicons-react"
import classNames from "classnames"
import ContentEditable from "react-contenteditable"
import TimeAgo from "react-timeago"

import * as api from "../../lib/api"
import Breadcrumbs from "../Breadcrumbs"
import Nav from "../Nav"
import ScratchIcon from "../ScratchIcon"
import { SpecialKey, useShortcut } from "../Shortcut"
import UserAvatar from "../user/UserAvatar"

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

function Actions({ isCompiling, compile, scratch, setScratch, setDecompilationTabEnabled }: Props) {
    const userIsYou = api.useUserIsYou()
    const forkScratch = api.useForkScratchAndGo(scratch)
    const [fuzzySaveAction, fuzzySaveScratch] = useFuzzySaveCallback(scratch, setScratch)
    const [isSaving, setIsSaving] = useState(false)
    const canSave = scratch.owner && userIsYou(scratch.owner)

    const fuzzyShortcut = useShortcut([SpecialKey.CTRL_COMMAND, "S"], async () => {
        setIsSaving(true)
        await fuzzySaveScratch()
        setIsSaving(false)
    })

    const compileShortcut = useShortcut([SpecialKey.CTRL_COMMAND, "J"], () => {
        compile()
    })

    return <ul className={styles.actions} aria-label="Scratch actions">
        <li>
            <Link href="/new">
                <a>
                    <FileIcon />
                    New
                </a>
            </Link>
        </li>
        <li>
            <button
                onClick={async () => {
                    setIsSaving(true)
                    await fuzzySaveScratch()
                    setIsSaving(false)
                }}
                disabled={!canSave || isSaving}
                title={fuzzyShortcut}
            >
                <UploadIcon />
                Save
            </button>
        </li>
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
            <button onClick={() => exportScratchZip(scratch)}>
                <DownloadIcon />
                    Export..
            </button>
        </li>
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
        <li>
            <button onClick={() => setDecompilationTabEnabled(true)}>
                <IterationsIcon />
                Decompile..
            </button>
        </li>
    </ul>
}

export type Props = {
    isCompiling: boolean
    compile: () => Promise<void>
    scratch: Readonly<api.Scratch>
    setScratch: (scratch: Partial<api.Scratch>) => void
    setDecompilationTabEnabled: (enabled: boolean) => void
}

export default function ScratchToolbar(props: Props) {
    const { scratch, setScratch } = props
    const userIsYou = api.useUserIsYou()
    const isActive = (Date.now() - (new Date(scratch.last_updated)).getTime()) < 1000 * 60

    return <Nav border>
        <div className={styles.container}>
            <Breadcrumbs className={styles.breadcrumbs} pages={[
                scratch.owner && {
                    label: <div className={styles.owner}>
                        <UserAvatar user={scratch.owner} className={styles.ownerAvatar} />
                        <span className={styles.ownerName}>
                            {scratch.owner.username}
                        </span>
                    </div>,
                    href: !scratch.owner.is_anonymous && `/u/${scratch.owner.username}`,
                },
                {
                    label: <div className={styles.iconNamePair}>
                        <ScratchIcon scratch={scratch} size={20} />
                        <ScratchName
                            name={scratch.name}
                            onChange={userIsYou(scratch.owner) && (name => setScratch({ name }))}
                        />
                    </div>,
                },
            ].filter(Boolean)} />
            <div className={styles.actionsContainer}>
                <Actions {...props} />
                <div className={styles.lastEditTime} aria-label="Edit time">
                    {isActive ? <>
                        Active now
                    </> : <>
                        Edited <TimeAgo date={scratch.last_updated} />
                    </>}
                </div>
            </div>
        </div>
    </Nav>
}
