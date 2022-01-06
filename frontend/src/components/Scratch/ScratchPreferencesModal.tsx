import { useEffect, useState } from "react"

import { XIcon } from "@primer/octicons-react"
import Modal from "react-modal"

import { useAutoRecompileSetting } from "../../lib/settings"
import Tabs, { Tab } from "../Tabs"

import styles from "./ScratchPreferencesModal.module.scss"

function DiffPrefs() {
    const [autoRecompile, setAutoRecompile] = useAutoRecompileSetting()

    return <div>
        <section>
            <h2 className={styles.sectionTitle}>Diff preferences</h2>
            <label className={styles.booleanPreference}>
                <input
                    type="checkbox"
                    checked={autoRecompile}
                    onChange={evt => setAutoRecompile(evt.target.checked)}
                />
                Automatically compile on change
            </label>
        </section>
    </div>
}

export default function ScratchPreferencesModal({ open, onClose }: { open: boolean, onClose?: () => void }) {
    const [tab, setTab] = useState("diff")
    const [windowWidth, setWindowWidth] = useState(window.innerWidth)

    useEffect(() => {
        const handler = () => setWindowWidth(window.innerWidth)
        window.addEventListener("resize", handler)
        return () => window.removeEventListener("resize", handler)
    })

    return <Modal
        isOpen={open}
        onRequestClose={onClose}
        className={styles.dialog}
        overlayClassName={styles.overlay}
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
                    <Tab tabKey="diff" label="Diff" />
                </Tabs>
            </div>
            <div className={styles.right}>
                {tab === "diff" && <DiffPrefs />}
            </div>
        </div>
    </Modal>
}
