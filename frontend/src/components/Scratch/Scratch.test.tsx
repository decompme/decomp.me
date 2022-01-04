import React from "react"

import { act, render } from "@testing-library/react"

import * as api from "../../lib/api"

import Scratch from "./Scratch"

const scratchJson: api.Scratch = {
    "url": "http://localhost/api/scratch/qCxNx",
    "slug": "qCxNx",
    "html_url": "http://localhost/scratch/qCxNx",
    "owner": {
        "is_anonymous": true,
        "id": 8,
    },
    "source_code": "",
    "context": "",
    "name": "Untitled",
    "description": "",
    "creation_time": "2022-01-03T11:17:46.358052+09:00",
    "last_updated": "2022-01-03T23:47:03.804075+09:00",
    "compiler": "gcc2.8.1",
    "platform": "n64",
    "compiler_flags": "-O2 -fforce-addr",
    "diff_label": "",
    "score": 0,
    "max_score": 0,
    "parent": null,
}

test("renders without causing a state change", async () => {
    const onChange = jest.fn()

    act(() => {
        render(<Scratch
            scratch={scratchJson}
            onChange={onChange}
        />)
    })

    expect(onChange).toHaveBeenCalledTimes(0)
})
