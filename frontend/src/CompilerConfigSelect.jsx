import { h } from "preact"
import { useState } from "preact/hooks"
import useSWR from "swr"

import * as api from "./api"

export default function CompilerConfigSelect({ value, onChange }) {
    const { data, error } = useSWR("/compiler_configs", api.get)

    if (error) {
        if (value !== null) {
            onChange(null)
        }

        return <span>{error}</span>
    } else if (data) {
        const validIds = Object.values(data).reduce((sum, configs) => {
            for (const config of configs) {
                sum.push(config.id)
            }

            return sum
        }, [])

        if (!validIds.includes(value)) {
            onChange(validIds[0])
        }

        return <div>
            <label>Compiler</label>
            <br />

            <select onChange={event => onChange(parseInt(event.target.value))}>
                {Object.entries(data).map(([compiler, configs]) => {
                    return <optgroup label={compiler}>
                        {configs.map(config => <option value={config.id}>{compiler} {config.flags}</option>)}
                    </optgroup>
                })}
            </select>
        </div>
    } else {
        return <span>Loading...</span>
    }
}
