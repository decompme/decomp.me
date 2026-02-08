import Link from "next/link";

import useSWR from "swr";

import LoadingSpinner from "@/components/loading.svg";
import { PlatformIcon } from "@/components/PlatformSelect/PlatformIcon";
import PlatformName from "@/components/PlatformSelect/PlatformName";
import { getScoreText } from "@/components/ScoreBadge";
import TimeAgo from "@/components/TimeAgo";
import UserLink from "@/components/user/UserLink";
import CopyButton from "@/components/CopyButton";
import { type Scratch, type PresetBase, get, usePreset } from "@/lib/api";
import { presetUrl, scratchUrl, scratchParentUrl } from "@/lib/api/urls";

import styles from "./AboutPanel.module.scss";

function ScratchLink({ url }: { url: string }) {
    const { data: scratch, error } = useSWR<Scratch>(url, get);

    if (error) {
        throw error;
    }

    if (!scratch) {
        return (
            <span className={styles.scratchLinkContainer}>
                <LoadingSpinner className="size-8 animate-pulse" />
            </span>
        );
    }

    return (
        <span className={styles.scratchLinkContainer}>
            <Link
                href={scratchUrl(scratch)}
                className={styles.scratchLink}
                prefetch={false}
            >
                {scratch.name || "Untitled scratch"}
            </Link>
            {scratch.owner && (
                <>
                    <span className={styles.scratchLinkByText}>by</span>
                    <UserLink user={scratch.owner} />
                </>
            )}
        </span>
    );
}

export type Props = {
    scratch: Scratch;
    setScratch?: (scratch: Partial<Scratch>) => void;
};

export default function AboutPanel({ scratch, setScratch }: Props) {
    const preset: PresetBase = usePreset(scratch.preset);

    return (
        <div className={styles.container}>
            <div>
                <div className={styles.horizontalField}>
                    <p className={styles.label}>Name</p>
                    <span>{scratch.name}</span>
                    <CopyButton
                        title="Copy Scratch link to clipboard"
                        text={`${window.location.origin}${scratchUrl(scratch)}`}
                    />
                </div>
                <div className={styles.horizontalField}>
                    <p className={styles.label}>Score</p>
                    <span>
                        {getScoreText(
                            scratch.score,
                            scratch.max_score,
                            scratch.match_override,
                        )}
                    </span>
                </div>
                {
                    <div className={styles.horizontalField}>
                        <p className={styles.label}>Owner</p>
                        {scratch.owner && <UserLink user={scratch.owner} />}
                    </div>
                }
                {scratch.parent && (
                    <div className={styles.horizontalField}>
                        <p className={styles.label}>Fork of</p>
                        <ScratchLink url={scratchParentUrl(scratch)} />
                    </div>
                )}
                <div className={styles.horizontalField}>
                    <p className={styles.label}>Platform</p>
                    <PlatformIcon
                        platform={scratch.platform}
                        className={styles.platformIcon}
                    />
                    <PlatformName platform={scratch.platform} />
                </div>
                {preset && (
                    <div className={styles.horizontalField}>
                        <p className={styles.label}>Preset</p>
                        <Link href={presetUrl(preset)} prefetch={false}>
                            {preset.name}
                        </Link>
                    </div>
                )}
                <div className={styles.horizontalField}>
                    <p className={styles.label}>Created</p>
                    <TimeAgo date={scratch.creation_time} />
                </div>
                <div className={styles.horizontalField}>
                    <p className={styles.label}>Modified</p>
                    <TimeAgo date={scratch.last_updated} />
                </div>
            </div>

            <hr className={styles.rule} />

            {setScratch || scratch.description ? (
                <div className={styles.grow}>
                    <p className={styles.label}>Description</p>
                    <textarea
                        className={styles.textArea}
                        value={scratch.description}
                        disabled={!setScratch}
                        onChange={(event) =>
                            setScratch?.({ description: event.target.value })
                        }
                        maxLength={5000}
                        placeholder="Add any notes about the scratch here"
                    />
                </div>
            ) : (
                <div />
            )}
        </div>
    );
}
