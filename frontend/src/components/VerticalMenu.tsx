import {
    createContext,
    type ReactNode,
    useCallback,
    useContext,
    useState,
} from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import clsx from "clsx";

import ErrorBoundary from "./ErrorBoundary";
import LoadingSpinner from "./loading.svg";
import Shortcut, {
    type Key,
    type ShortcutCallback,
    useShortcut,
} from "./Shortcut";
import styles from "./VerticalMenu.module.scss";

const MenuContext = createContext({
    open: true,
    setOpen: (_open: boolean) => {},
    setPointerEvents: (_pointerEvents: boolean) => {},
});

export interface Props {
    children: ReactNode;
    open: boolean;
    setOpen: (open: boolean) => void;
}

export default function VerticalMenu({ children, open, setOpen }: Props) {
    const [pointerEvents, setPointerEvents] = useState(true);

    return (
        <MenuContext.Provider value={{ open, setOpen, setPointerEvents }}>
            <ul
                className={styles.menu}
                onClick={(evt) => {
                    // Prevent reopening the menu
                    evt.stopPropagation();
                }}
                style={{
                    display: open ? "block" : "none",
                    pointerEvents: pointerEvents ? "auto" : "none",
                }}
            >
                <ErrorBoundary>{children}</ErrorBoundary>
            </ul>
        </MenuContext.Provider>
    );
}

export function MenuItem({
    className,
    children,
}: { className?: string; children: ReactNode }) {
    return <li className={clsx(styles.item, className)}>{children}</li>;
}

export function ButtonItem({
    children,
    disabled,
    onTrigger,
    shortcutKeys,
}: {
    children: ReactNode;
    disabled?: boolean;
    onTrigger: ShortcutCallback;
    shortcutKeys?: Key[];
}) {
    const { setOpen, setPointerEvents } = useContext(MenuContext);
    const [isLoading, setIsLoading] = useState(false);

    const trigger = async (event: any) => {
        if (!disabled) {
            setIsLoading(true);
            setPointerEvents(false);
            await onTrigger(event);
            setIsLoading(false);
            setPointerEvents(true);
            setOpen(false);
        }
    };

    useShortcut(shortcutKeys, trigger);

    return (
        <a
            className={clsx(styles.item, {
                [styles.disabled]: disabled,
            })}
            onClick={trigger}
        >
            <div className={styles.itemChildren}>{children}</div>

            {shortcutKeys && (
                <div
                    className={styles.right}
                    style={isLoading ? { display: "none" } : {}}
                >
                    <Shortcut keys={shortcutKeys} className={styles.shortcut} />
                </div>
            )}
            <div
                className={styles.right}
                style={isLoading ? {} : { display: "none" }}
            >
                <LoadingSpinner className="size-4" />
            </div>
        </a>
    );
}

export function LinkItem({
    children,
    href,
    disabled,
    shortcutKeys,
}: {
    children: ReactNode;
    href: string;
    disabled?: boolean;
    shortcutKeys?: Key[];
}) {
    const { setOpen } = useContext(MenuContext);
    const router = useRouter();

    useShortcut(
        shortcutKeys,
        useCallback(() => {
            if (!disabled) router.push(href);
        }, [disabled, router, href]),
    );

    return (
        <Link
            href={href}
            className={clsx(styles.item, {
                [styles.disabled]: disabled,
            })}
            onClick={() => {
                if (!disabled) setOpen(false);
            }}
        >
            <div className={styles.itemChildren}>{children}</div>
            {shortcutKeys && (
                <div>
                    <Shortcut keys={shortcutKeys} className={styles.shortcut} />
                </div>
            )}
        </Link>
    );
}
