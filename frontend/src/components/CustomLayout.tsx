import type { ReactElement } from "react"

import { Allotment } from "allotment"

import Tabs, { type Tab } from "./Tabs"

export interface HorizontalSplit {
    key: number
    kind: "horizontal"
    size: number
    children: Layout[]
}

export interface VerticalSplit {
    key: number
    kind: "vertical"
    size: number
    children: Layout[]
}

export interface Pane {
    key: number
    kind: "pane"
    size: number
    activeTab: string
    tabs: string[]
}

export type Layout = HorizontalSplit | VerticalSplit | Pane

export function visitLayout(layout: Layout, visitor: (layout: Layout) => void) {
    visitor(layout)

    if (layout.kind === "horizontal" || layout.kind === "vertical") {
        for (const child of layout.children) {
            visitLayout(child, visitor)
        }
    }
}

export function activateTabInLayout(layout: Layout, tab: string) {
    visitLayout(layout, node => {
        if (node.kind === "pane") {
            if (node.tabs.includes(tab)) {
                node.activeTab = tab
            }
        }
    })
}

export interface Props {
    layout: Layout
    onChange: (layout: Layout) => void
    renderTab: (id: string) => ReactElement<typeof Tab>
}

export default function CustomLayout({ renderTab, layout, onChange }: Props) {
    if (layout.kind === "pane") {
        const els = []

        for (const id of layout.tabs) {
            els.push(renderTab(id))
        }

        return <Tabs
            activeTab={layout.activeTab}
            onChange={activeTab => onChange({ ...layout, activeTab })}
        >
            {els}
        </Tabs>
    } else {
        const els = []
        const minCollapsedHeight = 37
        for (let index = 0; index < layout.children.length; index++) {
            const child = layout.children[index]

            const setChild = (newChild: Layout) => {
                const clone = JSON.parse(JSON.stringify(layout)) as HorizontalSplit | VerticalSplit
                clone.children[index] = newChild
                onChange(clone)
            }

            els.push(<Allotment.Pane
                key={child.key}
                minSize={minCollapsedHeight}
            >
                <CustomLayout
                    renderTab={renderTab}
                    layout={child}
                    onChange={setChild}
                />
            </Allotment.Pane>)
        }

        return <Allotment
            key={layout.kind} // Force remount when layout.kind changes
            vertical={layout.kind == "vertical"}
        >
            {els}
        </Allotment>
    }
}
