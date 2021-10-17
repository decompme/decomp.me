import React from "react"

import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import LoadingSpinner from "./loading.svg"
import Tabs, { Tab } from "./Tabs"

test("renders all panels", () => {
    const onChange = jest.fn()
    render(<Tabs activeTab="tab 1" onChange={onChange}>
        <Tab id="tab 1">
            Tab 1 panel
        </Tab>
        <Tab id="tab 2">
            Tab 2 panel
        </Tab>
    </Tabs>)

    const panels = screen.getAllByRole("tabpanel")
    expect(panels).toHaveLength(2)
})

test("triggers onChange when you click a tab", () => {
    const onChange = jest.fn()
    render(<Tabs activeTab="tab 1" onChange={onChange}>
        <Tab id="tab 1">
            Tab 1 panel
        </Tab>
        <Tab id="tab 2">
            Tab 2 panel
        </Tab>
    </Tabs>)

    const tabs = screen.getAllByRole("tab")

    userEvent.click(tabs[1])
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith("tab 2")

    userEvent.click(tabs[0])
    expect(onChange).toHaveBeenCalledTimes(2)
    expect(onChange).toHaveBeenCalledWith("tab 1")
})

test("renders with icon in tab label", () => {
    render(<Tabs activeTab="tab 1" onChange={jest.fn()}>
        <Tab id="tab 1" label={<LoadingSpinner />}>
            Tab 1 panel
        </Tab>
    </Tabs>)
})
