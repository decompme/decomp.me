import { ReactElement, ReactNode, createContext, Component, useState, createRef, RefObject, useLayoutEffect, useRef } from "react"

import classNames from "classnames"

import styles from "./Tabs.module.scss"

type Context = {
    activeTab: string | undefined,
    setActive: (tab: string | undefined) => void,
    hover: string | undefined,
    setHover: (tab: string | undefined) => void,
    setTabRef: (tab: string, ref: RefObject<HTMLButtonElement>) => void,
}

const TABS_CTX = createContext<Context>(null)

export type TabProps = {
    children: ReactNode,
    className?: string,
    key: string, // react doesn't actually give us this as a prop, but this forces ts into requiring it
    label?: ReactNode,
    disabled?: boolean,
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
                    onClick={() => ctx.setActive(key)}
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
    className?: string,
    children: ReactElement<typeof Tab> | ReactElement<typeof Tab>[] | ReactElement<typeof Tab>[][];
    activeTab: string | undefined;
    onChange: (tab: string) => void;
}

export default function Tabs<Key>({ children, activeTab, onChange, className }: Props) {
    const [hover, _setHover] = useState<string>()
    const bgRef = useRef<HTMLDivElement>()
    const isMovingBetweenButtons = useRef(false)

    const tabs: { [key: string]: { el: any, ref?: RefObject<HTMLButtonElement> } } = {}

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
                transform: `translateX(${button.offsetLeft}px)`,
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
            {Object.entries(tabs).map(([key, { el }]) => (
                <div
                    role="tabpanel"
                    className={classNames(styles.tabPanel, {
                        [styles.active]: key === activeTab,
                    })}
                    key={key}
                >
                    <div className={classNames(styles.tabPanelContent, el.props.className)}>
                        {el.props.children}
                    </div>
                </div>
            ))}
        </div>
    </TABS_CTX.Provider>
}
