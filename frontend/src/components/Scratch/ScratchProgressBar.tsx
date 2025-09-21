import * as Progress from "@radix-ui/react-progress";

import styles from "./ScratchProgressbar.module.scss";

export default function ScratchProgressBar({
    matchPercent,
}: {
    matchPercent: number;
}) {
    return (
        <Progress.Root className={styles.ProgressRoot} value={matchPercent}>
            <Progress.Indicator
                className={styles.ProgressIndicator}
                style={{
                    transform: `translateX(-${100 - matchPercent}%)`,
                    backgroundColor: `hsl(271, ${matchPercent * 0.91}%, ${30 + matchPercent * 0.35}%)`,
                }}
            />
        </Progress.Root>
    );
}
