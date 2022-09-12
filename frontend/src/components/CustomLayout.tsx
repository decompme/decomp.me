import { ReactNode } from "react"

import * as resizer from "react-simple-resizer"

import Tabs from "./Tabs"

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

export interface Props {
    layout: Layout
    onChange: (layout: Layout) => void
    renderTab: (id: string) => ReactNode
}

export default function CustomLayout({ renderTab, layout, onChange }: Props) {
    if (layout.kind === "pane") {
        const els = []

        for (const id of layout.tabs) {
            els.push(renderTab(id))
        }

        return <Tabs
            border={false}
            background="var(--g300)"
            activeTab={layout.activeTab}
            onChange={activeTab => onChange({ ...layout, activeTab })}
        >
            {els}
        </Tabs>
    } else {
        const els = []

        for (let index = 0; index < layout.children.length; index++) {
            const child = layout.children[index]

            const setChild = (newChild: Layout) => {
                const clone = JSON.parse(JSON.stringify(layout)) as HorizontalSplit | VerticalSplit
                clone.children[index] = newChild
                onChange(clone)
            }

            els.push(<resizer.Section
                key={child.key}
                defaultSize={child.size}
                onSizeChanged={size => setChild({ ...child, size })}
                minSize={100}
                style={{
                    display: "flex",
                    flexDirection: "column",
                }}
            >
                <CustomLayout
                    renderTab={renderTab}
                    layout={child}
                    onChange={setChild}
                />
            </resizer.Section>)

            // Put a bar between each section
            if (index != layout.children.length - 1) {
                els.push(<resizer.Bar
                    key={child.key + "__bar"}
                    size={1}
                    expandInteractiveArea={{ left: 2, right: 2 }}
                    style={{ background: "var(--g500)" }}
                />)
            }
        }

        return <resizer.Container vertical={layout.kind == "vertical"} style={{ width: "100%", height: "100%" }}>
            {els}
        </resizer.Container>
    }
}
