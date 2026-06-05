import {
    useEffect,
    useRef,
    useState,
    type FC,
    type ClipboardEvent,
    type KeyboardEvent,
    type MouseEvent,
    type JSX,
} from "react";

import {
    CheckIcon,
    DownloadIcon,
    FileIcon,
    IterationsIcon,
    MilestoneIcon,
    RepoForkedIcon,
    SyncIcon,
    TrashIcon,
    UploadIcon,
} from "@primer/octicons-react";
import clsx from "clsx";
import ContentEditable from "react-contenteditable";
import Link from "@/components/Link";

import TimeAgo from "@/components/TimeAgo";
import * as api from "@/lib/api";
import { scratchUrl } from "@/lib/api/urls";
import { useSize } from "@/lib/hooks";

import Breadcrumbs from "../Breadcrumbs";
import Nav from "../Nav";
import PlatformLink from "../PlatformLink";
import { SpecialKey, useShortcut } from "../Shortcut";
import UserAvatar from "../user/UserAvatar";

import styles from "./ScratchToolbar.module.scss";

const ACTIVE_MS = 1000 * 60;

// Prevents XSS
function htmlTextOnly(html: string): string {
    return html.replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function exportScratchZip(scratch: api.Scratch) {
    const url = api.normalizeUrl(`${scratchUrl(scratch)}/export`);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${scratch.name}.zip`;
    a.click();
}

function startScratchTour(event?: MouseEvent<HTMLButtonElement>) {
    event?.currentTarget.blur();
    window.setTimeout(() => {
        window.dispatchEvent(new CustomEvent("scratch-tour:start"));
    }, 0);
}

function EditTimeAgo({ date }: { date: string }) {
    const isActive = Date.now() - new Date(date).getTime() < ACTIVE_MS;

    // Rerender after ACTIVE_MS has elapsed if isActive=true
    const [, forceUpdate] = useState({});
    useEffect(() => {
        if (isActive) {
            const timeout = setTimeout(() => forceUpdate({}), ACTIVE_MS);
            return () => clearTimeout(timeout);
        }
    }, [isActive]);

    return (
        <span className={styles.lastEditTime}>
            {isActive ? (
                <>Active now</>
            ) : (
                <>
                    <TimeAgo date={date} />
                </>
            )}
        </span>
    );
}

function ScratchName({
    name,
    onChange,
}: { name: string; onChange?: (name: string) => void }) {
    const [isEditing, setEditing] = useState(false);
    const editableRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const el = editableRef.current;

        if (el) {
            const range = document.createRange();
            range.selectNodeContents(el);
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
        }
    }, [isEditing]);

    if (isEditing) {
        return (
            <ContentEditable
                innerRef={editableRef}
                tagName="div"
                html={htmlTextOnly(name)}
                spellCheck={false}
                className={styles.name}
                onChange={(evt) => {
                    const name = evt.currentTarget.innerText as string;
                    if (name.length !== 0) onChange(name);
                }}
                onPaste={(evt: ClipboardEvent) => {
                    // Only allow pasting text, rather than any HTML. This is redundant due
                    // to htmlTextOnly but it's nice not to show "<img>" when you paste an image.

                    evt.preventDefault();
                    const text = evt.clipboardData.getData("text");

                    // note: we're using document.execCommand, which is deprecated,
                    // but its no big deal if it doesn't work.
                    document.execCommand("insertText", false, text);
                }}
                onBlur={() => setEditing(false)}
                onKeyDown={(evt: KeyboardEvent) => {
                    if (evt.key === "Enter") {
                        evt.preventDefault();
                        setEditing(false);
                    }
                }}
            />
        );
    } else {
        return (
            <div
                className={clsx(styles.name, {
                    [styles.editable]: !!onChange,
                })}
                onClick={() => {
                    if (onChange) setEditing(true);
                }}
            >
                {name}
            </div>
        );
    }
}

function NewScratchButton() {
    return (
        <Link href="/new">
            <FileIcon />
            <span className="hidden md:inline">New</span>
        </Link>
    );
}

function ActionButton({
    onClick,
    disabled = false,
    title,
    icon,
    text,
    dataTour,
}: {
    onClick: (event: MouseEvent<HTMLButtonElement>) => void | Promise<void>;
    disabled?: boolean;
    title?: string;
    icon: JSX.Element;
    text: string;
    dataTour?: string;
}) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            title={title}
            aria-label={text}
            data-tour={dataTour}
        >
            {icon}
            <span className="hidden md:inline">{text}</span>
        </button>
    );
}

function Actions({
    isCompiling,
    compile,
    scratch,
    setScratch,
    saveCallback,
    deleteScratch,
    setDecompilationTabEnabled,
    tourTargetsEnabled = true,
}: Props) {
    const userIsYou = api.useUserIsYou();
    const forkScratch = api.useForkScratchAndGo(scratch);
    const saveScratchRequest = api.useSaveScratch(scratch);
    const [isSaving, setIsSaving] = useState(false);
    const [isForking, setIsForking] = useState(false);

    const canSave = !!(scratch.owner && userIsYou(scratch.owner));
    const isSaved = api.useIsScratchSaved(scratch);

    const platform = api.usePlatform(scratch.platform);

    const saveScratch = async () => {
        if (!canSave || isSaved || isSaving) return;

        setIsSaving(true);
        try {
            setScratch(await saveScratchRequest());
            saveCallback();
        } finally {
            setIsSaving(false);
        }
    };

    const forkCurrentScratch = async () => {
        if (isForking) return;

        setIsForking(true);
        try {
            await forkScratch();
            saveCallback();
        } finally {
            setIsForking(false);
        }
    };

    const fuzzyShortcut = useShortcut(
        [SpecialKey.CTRL_COMMAND, "S"],
        canSave ? saveScratch : forkCurrentScratch,
    );

    const compileShortcut = useShortcut([SpecialKey.CTRL_COMMAND, "J"], () => {
        compile();
    });

    const isAdmin = api.useThisUserIsAdmin();

    return (
        <ul className={styles.actions} aria-label="Scratch actions">
            <li>
                <NewScratchButton />
            </li>
            {canSave && (
                <li>
                    <ActionButton
                        onClick={saveScratch}
                        disabled={isSaved || isSaving}
                        title={isSaved ? "No unsaved changes" : fuzzyShortcut}
                        text={isSaved ? "Saved" : "Save"}
                        icon={isSaved ? <CheckIcon /> : <UploadIcon />}
                        dataTour={
                            tourTargetsEnabled
                                ? "scratch-action-save"
                                : undefined
                        }
                    />
                </li>
            )}
            <li>
                <ActionButton
                    onClick={forkCurrentScratch}
                    disabled={isForking}
                    title={!canSave ? fuzzyShortcut : undefined}
                    text={!canSave ? "Fork to save" : "Fork"}
                    icon={<RepoForkedIcon />}
                    dataTour={
                        tourTargetsEnabled ? "scratch-action-fork" : undefined
                    }
                />
            </li>
            {((scratch.owner && userIsYou(scratch.owner)) || isAdmin) && (
                <li>
                    <ActionButton
                        onClick={(event) => {
                            if (
                                event.shiftKey ||
                                confirm(
                                    "Are you sure you want to delete this scratch? This action cannot be undone.",
                                )
                            ) {
                                void deleteScratch();
                            }
                        }}
                        text="Delete"
                        icon={<TrashIcon />}
                        dataTour={
                            tourTargetsEnabled
                                ? "scratch-action-delete"
                                : undefined
                        }
                    />
                </li>
            )}
            <li>
                <ActionButton
                    onClick={() => exportScratchZip(scratch)}
                    text="Export"
                    icon={<DownloadIcon />}
                    dataTour={
                        tourTargetsEnabled ? "scratch-action-export" : undefined
                    }
                />
            </li>
            <li>
                <ActionButton
                    onClick={compile}
                    title={compileShortcut}
                    disabled={isCompiling}
                    text="Compile"
                    icon={<SyncIcon />}
                    dataTour={
                        tourTargetsEnabled
                            ? "scratch-action-compile"
                            : undefined
                    }
                />
            </li>
            {platform?.has_decompiler && (
                <li>
                    <ActionButton
                        onClick={() => setDecompilationTabEnabled(true)}
                        icon={<IterationsIcon />}
                        text="Decompile"
                        dataTour={
                            tourTargetsEnabled
                                ? "scratch-action-decompile"
                                : undefined
                        }
                    />
                </li>
            )}
            <li className="hidden md:list-item">
                <ActionButton
                    onClick={startScratchTour}
                    icon={<MilestoneIcon />}
                    text="Tour"
                    dataTour={
                        tourTargetsEnabled ? "scratch-action-tour" : undefined
                    }
                />
            </li>
        </ul>
    );
}

enum ActionsLocation {
    IN_NAV = 0,
    BELOW_NAV = 1,
}

function useActionsLocation(): [ActionsLocation, FC<Props>] {
    const inNavActions = useSize<HTMLDivElement>();

    let location = ActionsLocation.BELOW_NAV;

    const el = inNavActions.ref.current;
    if (el) {
        if (el.clientWidth === el.scrollWidth) {
            location = ActionsLocation.IN_NAV;
        }
    }

    return [
        location,
        (props: Props) => (
            <div
                ref={inNavActions.ref}
                aria-hidden={location !== ActionsLocation.IN_NAV}
                className={styles.inNavActionsContainer}
            >
                <Actions
                    {...props}
                    tourTargetsEnabled={location === ActionsLocation.IN_NAV}
                />
            </div>
        ),
    ];
}

export type Props = {
    isCompiling: boolean;
    compile: () => Promise<void>;
    scratch: Readonly<api.Scratch>;
    setScratch: (scratch: Partial<api.Scratch>) => void;
    saveCallback: () => void;
    deleteScratch: () => Promise<void>;
    setDecompilationTabEnabled: (enabled: boolean) => void;
    tourTargetsEnabled?: boolean;
};

export default function ScratchToolbar(props: Props) {
    const { scratch, setScratch } = props;
    const userIsYou = api.useUserIsYou();

    const [actionsLocation, InNavActions] = useActionsLocation();

    return (
        <>
            <Nav>
                <div className={styles.container} data-tour="scratch-toolbar">
                    <Breadcrumbs
                        className={styles.breadcrumbs}
                        pages={[
                            scratch.owner && {
                                label: (
                                    <div className={styles.owner}>
                                        <UserAvatar
                                            user={scratch.owner}
                                            className={styles.ownerAvatar}
                                        />
                                        <span className={styles.ownerName}>
                                            {scratch.owner.username}
                                        </span>
                                    </div>
                                ),
                                href:
                                    !scratch.owner.is_anonymous &&
                                    `/u/${scratch.owner.username}`,
                            },
                            {
                                label: (
                                    <div className={styles.iconNamePair}>
                                        <PlatformLink
                                            platform={scratch.platform}
                                            size={20}
                                        />
                                        <span data-tour="scratch-name">
                                            <ScratchName
                                                name={scratch.name}
                                                onChange={
                                                    userIsYou(scratch.owner) &&
                                                    ((name) =>
                                                        setScratch({ name }))
                                                }
                                            />
                                        </span>
                                        <span className="hidden md:inline">
                                            <EditTimeAgo
                                                date={scratch.last_updated}
                                            />
                                        </span>
                                    </div>
                                ),
                            },
                        ].filter(Boolean)}
                    />
                    <InNavActions {...props} />
                </div>
            </Nav>
            {actionsLocation === ActionsLocation.BELOW_NAV && (
                <div
                    className={clsx(
                        styles.belowNavActionsContainer,
                        "border-gray-6 border-b",
                    )}
                >
                    <Actions {...props} tourTargetsEnabled />
                </div>
            )}
        </>
    );
}
