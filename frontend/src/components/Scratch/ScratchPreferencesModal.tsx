import { ChangeEvent, useEffect, useState } from "react"

import { XIcon } from "@primer/octicons-react"
import classNames from "classnames"

import { useAutoRecompileSetting, useAutoRecompileDelaySetting, useCodeFontSize, useDiffFontSize } from "../../lib/settings"
import Modal from "../Modal"
import NumberInput from "../NumberInput"
import Tabs, { Tab } from "../Tabs"

import styles from "./ScratchPreferencesModal.module.scss"

function CodePrefs() {
    const [fontSize, setFontSize] = useCodeFontSize()

    return <div>
        <section>
            <h2 className={styles.sectionTitle}>Code editor preferences</h2>
            <div className={styles.intPreference}>
                <input
                    type="range"
                    min="8" max="24" step="1" value={fontSize ?? "12"}
                    onChange={(evt: ChangeEvent<HTMLInputElement>) => setFontSize(+evt.target.value)}
                />
                <NumberInput value={fontSize ?? 12} onChange={setFontSize}/>px
                font size
            </div>
        </section>
    </div>
}

function DiffPrefs() {
    const [autoRecompile, setAutoRecompile] = useAutoRecompileSetting()
    const [autoRecompileDelay, setAutoRecompileDelay] = useAutoRecompileDelaySetting()
    const [fontSize, setFontSize] = useDiffFontSize()

    const minDelay = 50
    const onChange = (duration: number) => setAutoRecompileDelay(Math.max(minDelay, duration))

    return <div>
        <section>
            <h2 className={styles.sectionTitle}>Diff preferences</h2>
            <div className={styles.intPreference}>
                <input
                    type="range"
                    min="8" max="24" step="1" value={fontSize ?? "12"}
                    onChange={(evt: ChangeEvent<HTMLInputElement>) => setFontSize(+evt.target.value)}
                />
                <NumberInput value={fontSize ?? 12} onChange={setFontSize}/>px
                font size
            </div>
            <label className={styles.booleanPreference}>
                <input
                    type="checkbox"
                    checked={autoRecompile}
                    onChange={evt => setAutoRecompile(evt.target.checked)}
                />
                Automatically compile on change
            </label>
            <div className={classNames(styles.intPreference, { [styles.disabled]: !autoRecompile })}>
                <input
                    type="range"
                    min={minDelay} max="2000" step="50" value={autoRecompileDelay}
                    onChange={(evt: ChangeEvent<HTMLInputElement>) => onChange(+evt.target.value)}
                    disabled={!autoRecompile}
                />
                <NumberInput value={autoRecompileDelay} onChange={onChange} disabled={!autoRecompile}/>ms
                delay before recompile is triggered
            </div>
        </section>
    </div>
}

export default function ScratchPreferencesModal({ open, onClose }: { open: boolean, onClose?: () => void }) {
    const [tab, setTab] = useState("code")
    const [windowWidth, setWindowWidth] = useState(window.innerWidth)

    useEffect(() => {
        const handler = () => setWindowWidth(window.innerWidth)
        window.addEventListener("resize", handler)
        return () => window.removeEventListener("resize", handler)
    })

    return <Modal
        isOpen={open}
        onRequestClose={onClose}
        contentLabel="Editor preferences"
    >
        <div className={styles.container} onClick={evt => evt.stopPropagation()}>
            <button className={styles.closeButton} onClick={onClose} aria-label="Close">
                <XIcon size={16} />
            </button>
            <div className={styles.left}>
                <h1 className={styles.titleText}>
                Editor preferences
                </h1>
                <Tabs
                    activeTab={tab}
                    onChange={tab => setTab(tab)}
                    vertical={windowWidth > 800}
                    border={false}
                    className={styles.tabs}
                >
                    <Tab tabKey="code" label="Code editor" />
                    <Tab tabKey="diff" label="Diff" />
                </Tabs>
            </div>
            <div className={styles.right}>
                {tab === "code" && <CodePrefs />}
                {tab === "diff" && <DiffPrefs />}
                {tab === "code" && <CodePrefs />}
            </div>
        </div>
    </Modal>
}
