import { h } from "preact"

import * as api from "../api"

import styles from "./Diff.module.css"

export type Props = {
    compilation: api.Compilation,
}

export default function Diff({ compilation }: Props) {
    return <div class={styles.container}>
        {compilation.diff_output
            ? <code class={styles.diff} dangerouslySetInnerHTML={{ __html: compilation.diff_output }} />
            : <div class={styles.log}>{compilation.errors}</div>}
    </div>
}
