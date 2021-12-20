import React from "react"

import { act, render } from "@testing-library/react"

import * as api from "../../lib/api"

import Scratch from "./Scratch"

const scratchJson: api.Scratch = {
    "slug": "test",
    "name": "",
    "description": "I am the description",
    "compiler": "ido5.3",
    "platform": "mips",
    "compiler_flags": "-O2 -fforce-addr",
    "source_code": "void func(void) {\n    // ...\n}",
    "context": "",
    "owner": {
        "is_you": true,
        "is_anonymous": true,
    },
    "parent": null,
    "diff_label": "",
    "score": 0,
}

test("renders without causing a state change", async () => {
    const onChange = jest.fn()

    act(() => {
        render(<Scratch
            scratch={scratchJson}
            isSaved
            onChange={onChange}
        />)
    })

    expect(onChange).toHaveBeenCalledTimes(0)
})

// TODO: test various buttons appear based on which onX functions are passed in
