import { useRouter } from "next/router"

import Nav from "../../components/Nav"
import PageTitle from "../../components/PageTitle"
import Tabs, { Tab } from "../../components/Tabs"
import { useAutoRecompileSetting, useAutoRecompileDelaySetting } from "../../lib/settings"

import styles from "./[tab].module.scss"

export default function SettingsPage() {
    const [autoRecompile, setAutoRecompile] = useAutoRecompileSetting()
    const [autoRecompileDelay, setAutoRecompileDelay] = useAutoRecompileDelaySetting()
    const router = useRouter()
    const { tab } = router.query as { tab: string }

    return <>
        <PageTitle title="Settings" />
        <Nav />
        <main className={styles.container}>
            <Tabs
                activeTab={tab}
                onChange={tab => router.push(`/settings/${tab}`)}
                className={styles.tabs}
            >
                <Tab key="editor" tabKey="editor" label="Editor preferences">
                    <div className={styles.tabPanel}>
                        <label>
                            <input
                                type="checkbox"
                                checked={autoRecompile}
                                onChange={evt => setAutoRecompile(evt.target.checked)}
                            />
                            Automatically recompile when changed
                        </label>
                        <label className={styles.intPreference}>
                            <input
                                type="range"
                                min="50" max="2000" step="50" value={autoRecompileDelay}
                                onChange={evt => setAutoRecompileDelay(evt.target.value)}
                            />
                            <input className={styles.numberInput}
                                type="number"
                                min="50" max="2000" step="50" value={autoRecompileDelay}
                                onChange={evt => setAutoRecompileDelay(evt.target.value)}
                            />
                            ms Delay before recompile is triggered
                        </label>
                    </div>
                </Tab>
            </Tabs>

        </main>
    </>
}
