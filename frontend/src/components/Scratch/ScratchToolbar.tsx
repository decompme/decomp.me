import { useEffect, useRef, useState, type FC } from "react"

import Link from "next/link"

import { DownloadIcon, FileIcon, IterationsIcon, RepoForkedIcon, SyncIcon, TrashIcon, UploadIcon } from "@primer/octicons-react"
import classNames from "classnames"
import ContentEditable from "react-contenteditable"

import TimeAgo from "@/components/TimeAgo"
import * as api from "@/lib/api"
import { scratchUrl } from "@/lib/api/urls"
import { useSize } from "@/lib/hooks"

import Breadcrumbs from "../Breadcrumbs"
import Nav from "../Nav"
import PlatformLink from "../PlatformLink"
import { SpecialKey, useShortcut } from "../Shortcut"
import UserAvatar from "../user/UserAvatar"

import useFuzzySaveCallback, { FuzzySaveAction } from "./hooks/useFuzzySaveCallback"
import styles from "./ScratchToolbar.module.scss"

const ACTIVE_MS = 1000 * 60

// Prevents XSS
function htmlTextOnly(html: string): string {
    return html.replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

function exportScratchZip(scratch: api.Scratch) {
    const url = api.normalizeUrl(`${scratchUrl(scratch)}/export`)
    const a = document.createElement("a")
    a.href = url
    a.download = `${scratch.name}.zip`
    a.click()
}

async function deleteScratch(scratch: api.Scratch) {
    await api.delete_(scratchUrl(scratch), {})

    window.location.href = scratch.project ? `/${scratch.project}` : "/"
}

function EditTimeAgo({ date }: { date: string }) {
    const isActive = (Date.now() - (new Date(date)).getTime()) < ACTIVE_MS

    // Rerender after ACTIVE_MS has elapsed if isActive=true
    const [, forceUpdate] = useState({})
    useEffect(() => {
        if (isActive) {
            const interval = setTimeout(() => forceUpdate({}), ACTIVE_MS)
            return () => clearInterval(interval)
        }
    }, [isActive])

    return <span className={styles.lastEditTime}>
        {isActive ? <>
            Active now
        </> : <>
            <TimeAgo date={date} />
        </>}
    </span>
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
                if (name.length !== 0)
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

function Actions({ isCompiling, compile, scratch, setScratch, saveCallback, setDecompilationTabEnabled }: Props) {
    const userIsYou = api.useUserIsYou()
    const forkScratch = api.useForkScratchAndGo(scratch)
    const [fuzzySaveAction, fuzzySaveScratch] = useFuzzySaveCallback(scratch, setScratch)
    const [isSaving, setIsSaving] = useState(false)
    const [isForking, setIsForking] = useState(false)
    const canSave = scratch.owner && userIsYou(scratch.owner)

    const platform = api.usePlatform(scratch.platform)

    const fuzzyShortcut = useShortcut([SpecialKey.CTRL_COMMAND, "S"], async () => {
        setIsSaving(true)
        await fuzzySaveScratch()
        setIsSaving(false)
        saveCallback()
    })

    const compileShortcut = useShortcut([SpecialKey.CTRL_COMMAND, "J"], () => {
        compile()
    })

    const isAdmin = api.useThisUserIsAdmin()

    return (
        <ul className={styles.actions} aria-label="Scratch actions">
            <li>
                <Link href="/new">

                    <FileIcon />New
                </Link>
            </li>
            <li>
                <button
                    onClick={async () => {
                        setIsSaving(true)
                        await fuzzySaveScratch()
                        setIsSaving(false)
                        saveCallback()
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
                    onClick={async () => {
                        setIsForking(true)
                        await forkScratch()
                        setIsForking(false)
                        saveCallback()
                    }}
                    disabled={isForking}
                    title={fuzzySaveAction === FuzzySaveAction.FORK ? fuzzyShortcut : undefined}
                >
                    <RepoForkedIcon />
                    Fork
                </button>
            </li>
            {((scratch.owner && userIsYou(scratch.owner)) || isAdmin) && <li>
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
                        Export
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
            {platform?.has_decompiler &&
                <li>
                    <button onClick={() => setDecompilationTabEnabled(true)}>
                        <IterationsIcon />
                        Decompile
                    </button>
                </li>
            }
        </ul>
    )
}

enum ActionsLocation {
    IN_NAV = 0,
    BELOW_NAV = 1,
}

function useActionsLocation(): [ActionsLocation, FC<Props>] {
    const inNavActions = useSize<HTMLDivElement>()

    let location = ActionsLocation.BELOW_NAV

    const el = inNavActions.ref.current
    if (el) {
        if (el.clientWidth === el.scrollWidth) {
            location = ActionsLocation.IN_NAV
        }
    }

    return [
        location,
        (props: Props) => <div
            ref={inNavActions.ref}
            aria-hidden={location !== ActionsLocation.IN_NAV}
            className={styles.inNavActionsContainer}
        >
            <Actions {...props} />
        </div>,
    ]
}

export type Props = {
    isCompiling: boolean
    compile: () => Promise<void>
    scratch: Readonly<api.Scratch>
    setScratch: (scratch: Partial<api.Scratch>) => void
    saveCallback: () => void
    setDecompilationTabEnabled: (enabled: boolean) => void
}

export default function ScratchToolbar(props: Props) {
    const { scratch, setScratch } = props
    const userIsYou = api.useUserIsYou()

    const [actionsLocation, InNavActions] = useActionsLocation()

    return <>
        <Nav>
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
                            <PlatformLink scratch={scratch} size={20} />
                            <ScratchName
                                name={scratch.name}
                                onChange={userIsYou(scratch.owner) && (name => setScratch({ name }))}
                            />
                            <EditTimeAgo date={scratch.last_updated} />
                        </div>,
                    },
                ].filter(Boolean)} />
                <InNavActions {...props} />
            </div>
        </Nav>
        {actionsLocation === ActionsLocation.BELOW_NAV && <div className={classNames(styles.belowNavActionsContainer, "border-gray-6 border-b")}>
            <Actions {...props} />
        </div>}
    </>
}
