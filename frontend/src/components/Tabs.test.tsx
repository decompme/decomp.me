/**
 * @jest-environment jsdom
 */

import React from "react"

import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import Tabs, { Tab } from "./Tabs"

describe("Tabs", () => {
    it("renders all panels", () => {
        const onChange = jest.fn()
        render(<Tabs activeTab="tab 1" onChange={onChange}>
            <Tab key="tab 1">
                Tab 1 panel
            </Tab>
            <Tab key="tab 2">
                Tab 2 panel
            </Tab>
        </Tabs>)

        const panels = screen.getAllByRole("tabpanel")
        expect(panels).toHaveLength(2)
    })

    it("triggers onChange when you click a tab", () => {
        const onChange = jest.fn()
        render(<Tabs activeTab="tab 1" onChange={onChange}>
            <Tab key="tab 1">
                Tab 1 panel
            </Tab>
            <Tab key="tab 2">
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
})
