import { type ReactElement, type ReactNode, createContext, Component, useState, createRef, type RefObject, useLayoutEffect, useRef } from "react"

import { XIcon } from "@primer/octicons-react"
import classNames from "classnames"

import ErrorBoundary from "./ErrorBoundary"
import styles from "./Tabs.module.scss"

type Context = {
    activeTab: string | undefined
    setActive: (tab: string | undefined) => void
    hover: string | undefined
    setHover: (tab: string | undefined) => void
    setTabRef: (tab: string, ref: RefObject<HTMLButtonElement>) => void
}

const TABS_CTX = createContext<Context>(null)

export function TabCloseButton({ onClick }: { onClick: () => void }) {
    return <button
        aria-label="Close"
        className={styles.closeButton}
        onClick={evt => {
            evt.stopPropagation() // Don't activate the tab
            onClick()
        }}
    >
        <XIcon />
    </button>
}

// Pass a ReactNode, or pass a function so the tab content can be rendered lazily.
export type TabContent = ReactNode | (() => ReactNode)

export type TabProps = {
    children?: TabContent
    className?: string
    tabKey: string
    label?: ReactNode
    disabled?: boolean
    onSelect?: () => void
}

export class Tab extends Component<TabProps> {
    ref = createRef<HTMLButtonElement>()

    render() {
        const key = this.props.tabKey

        return <TABS_CTX.Consumer>
            {ctx => {
                if (!ctx) {
                    console.error("Misplaced Tab (not in Tabs?)")
                    return <div>Misplaced Tab (not in Tabs?)</div>
                }

                if (typeof key !== "string") {
                    console.error("Misplaced Tab (no tabKey)")
                    return <div>Misplaced Tab (no tabKey?)</div>
                }

                ctx.setTabRef(key, this.ref)

                return <button
                    role="tab"
                    aria-selected={ctx.activeTab === key}
                    className={styles.tabButton}
                    disabled={this.props.disabled}
                    onClick={() => {
                        ctx.setActive(key)

                        if (this.props.onSelect) {
                            // run after layout
                            setTimeout(() => {
                                this.props.onSelect()
                            }, 0)
                        }
                    }}
                    onMouseMove={event => {
                        ctx.setHover(key)
                        event.stopPropagation()
                    }}
                    onFocus={() => {
                        ctx.setHover(key)
                    }}
                    ref={this.ref}
                >
                    {this.props.label ?? key}
                </button>
            }}
        </TABS_CTX.Consumer>
    }
}

export type Props = {
    className?: string
    children: ReactElement<typeof Tab> | ReactElement<typeof Tab>[] | ReactElement<typeof Tab>[][]
    activeTab: string | undefined
    onChange: (tab: string) => void
    vertical?: boolean
    border?: boolean
    background?: string
}

export default function Tabs({ children, activeTab, onChange, className, vertical, border, background }: Props) {
    const [hover, _setHover] = useState<string>()
    const bgRef = useRef<HTMLDivElement>()
    const isMovingBetweenButtons = useRef(false)

    const tabs: {
        [key: string]: {
            el: ReactElement<typeof Tab>
            ref?: RefObject<HTMLButtonElement>
        }
    } = {}

    if (Array.isArray(children)) {
        for (const child of children) {
            if (!child) {
            } else if (Array.isArray(child)) {
                for (const grandchild of child) {
                    if (grandchild) {
                        tabs[(grandchild.props as unknown as TabProps).tabKey] = { el: grandchild }
                    }
                }
            } else {
                tabs[(child.props as unknown as TabProps).tabKey] = { el: child }
            }
        }
    } else {
        tabs[(children.props as unknown as TabProps).tabKey] = { el: children }
    }

    const hoverChild = tabs[hover]

    const setHover = (tab: string | undefined) => {
        isMovingBetweenButtons.current = hover !== undefined && !!tab
        _setHover(tab)
    }

    useLayoutEffect(() => {
        const button = hoverChild?.ref?.current

        if (button) {
            Object.assign(bgRef.current.style, {
                opacity: 1,
                transform: `translate(${button.offsetLeft}px, ${vertical ? (button.offsetTop - 8) : button.offsetTop}px)`,
                width: vertical ? "" : `${button.offsetWidth}px`,
                height: vertical ? `${button.offsetHeight}px` : "",
            })
        } else {
            Object.assign(bgRef.current.style, {
                opacity: 0,
            })
        }

        Object.assign(bgRef.current.style, {
            transitionDuration: isMovingBetweenButtons.current ? ".15s" : "0s",
        })
    })

    // Switch to first tab if active tab is not found
    const activeChild = tabs[activeTab]
    const firstTab = Object.keys(tabs)[0]
    if (!activeChild && firstTab) {
        onChange(firstTab)
    }

    return <TABS_CTX.Provider
        value={{
            activeTab,
            setActive: onChange,
            hover,
            setHover,
            setTabRef: (key, ref) => {
                if (!tabs[key])
                    throw new Error(`No tab with key: '${key}'`)
                tabs[key].ref = ref
            },
        }}
    >
        <div
            className={classNames(
                styles.container,
                {
                    [styles.border]: typeof border === "undefined" ? true : border,
                    [styles.vertical]: vertical,
                },
                className,
            )}
        >
            <div
                role="tablist"
                className={styles.tabButtons}
                style={{ background }}
                onMouseMove={() => {
                    // If the event propagated here, no non-disabled tab is hovered over
                    setHover(undefined)
                }}
                onMouseLeave={() => setHover(undefined)}
                onBlur={() => setHover(undefined)}
            >
                {children}
                <div
                    ref={bgRef}
                    className={styles.tabButtonsBackground}
                />
            </div>
            {Object.entries(tabs).map(([key, { el }]) => {
                const props = el.props as unknown as TabProps
                const isActive = key === activeTab
                const children = typeof props.children === "function"
                    ? (isActive ? props.children() : null) // Render only when active
                    : props.children

                return <div
                    role="tabpanel"
                    className={classNames(styles.tabPanel, {
                        [styles.active]: isActive,
                    })}
                    key={key}
                >
                    <div className={classNames(styles.tabPanelContent, props.className)}>
                        <ErrorBoundary>
                            {children}
                        </ErrorBoundary>
                    </div>
                </div>
            })}
        </div>
    </TABS_CTX.Provider>
}
