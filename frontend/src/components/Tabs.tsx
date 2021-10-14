import { ReactElement, ReactNode, createContext, Component, useState, createRef, RefObject, useLayoutEffect, useRef } from "react"

import classNames from "classnames"

import styles from "./Tabs.module.scss"

type Context = {
    activeTab: string | undefined
    setActive: (tab: string | undefined) => void
    hover: string | undefined
    setHover: (tab: string | undefined) => void
    setTabRef: (tab: string, ref: RefObject<HTMLButtonElement>) => void
}

const TABS_CTX = createContext<Context>(null)

export type TabProps = {
    children: ReactNode
    className?: string
    key: string // react doesn't actually give us this as a prop, but this forces ts into requiring it
    label?: ReactNode
    disabled?: boolean
    onSelect?: () => void
}

export class Tab extends Component<TabProps> {
    ref = createRef<HTMLButtonElement>()

    render() {
        // @ts-ignore
        const key = this._reactInternals.key

        return <TABS_CTX.Consumer>
            {ctx => {
                if (!ctx) {
                    return <div>Misplaced Tab (not in Tabs?)</div>
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
}

export default function Tabs({ children, activeTab, onChange, className }: Props) {
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
            if (Array.isArray(child)) {
                for (const grandchild of child) {
                    tabs[grandchild.key] = { el: grandchild }
                }
            } else {
                tabs[child.key] = { el: child }
            }
        }
    } else {
        tabs[children.key] = { el: children }
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
                transform: `translate(${button.offsetLeft}px, ${button.offsetTop}px)`,
                width: `${button.offsetWidth}px`,
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

    return <TABS_CTX.Provider
        value={{
            activeTab,
            setActive: onChange,
            hover,
            setHover,
            setTabRef: (key, ref) => {
                tabs[key].ref = ref
            },
        }}
    >
        <div className={classNames(styles.container, className)}>
            <div
                role="tablist"
                className={styles.tabButtons}
                onMouseMove={() => {
                    // If the event propagated here, no non-disabled tab is hovered over
                    setHover(undefined)
                }}
                onMouseLeave={() => setHover(undefined)}
            >
                {children}
                <div
                    ref={bgRef}
                    className={styles.tabButtonsBackground}
                />
            </div>
            {Object.entries(tabs).map(([key, { el }]) => {
                const props = el.props as unknown as TabProps

                return <div
                    role="tabpanel"
                    className={classNames(styles.tabPanel, {
                        [styles.active]: key === activeTab,
                    })}
                    key={key}
                >
                    <div className={classNames(styles.tabPanelContent, props.className)}>
                        {props.children}
                    </div>
                </div>
            })}
        </div>
    </TABS_CTX.Provider>
}
