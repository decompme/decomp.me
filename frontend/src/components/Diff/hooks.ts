import { useState } from "react";

type ResizableColumns = {
    bar1Px: number;
    bar2Px: number;
    setBar1Px: (px: number) => void;
    setBar2Px: (px: number) => void;
};

export function useResizableColumns({
    width,
    columnCount,
    minColumnWidth = 80,
}: {
    width: number;
    columnCount: number;
    minColumnWidth?: number;
}): ResizableColumns {
    const [bar1Ratio, setBar1Ratio] = useState<number | null>(null);
    const [bar2Ratio, setBar2Ratio] = useState<number | null>(null);

    const defaultRatios = (() => {
        if (columnCount <= 1) return [1, 1];
        if (columnCount === 2) return [0.5, 1];
        return [1 / 3, 2 / 3];
    })();

    const r1 = bar1Ratio ?? defaultRatios[0];
    const r2 = bar2Ratio ?? defaultRatios[1];

    const rawBar1 = r1 * width;
    const rawBar2 = r2 * width;

    function clamp() {
        if (!width || columnCount <= 1) {
            return { bar1: width, bar2: width };
        }

        if (columnCount === 2) {
            const bar1 = Math.max(
                minColumnWidth,
                Math.min(width - minColumnWidth, rawBar1),
            );
            return { bar1, bar2: width };
        }

        const bar1 = Math.max(
            minColumnWidth,
            Math.min(width - minColumnWidth * 2, rawBar1),
        );

        const bar2 = Math.max(
            bar1 + minColumnWidth,
            Math.min(width - minColumnWidth, rawBar2),
        );

        return { bar1, bar2 };
    }

    const { bar1, bar2 } = clamp();

    const setBar1Px = (px: number) => {
        if (!width) return;
        setBar1Ratio(px / width);
    };

    const setBar2Px = (px: number) => {
        if (!width) return;
        setBar2Ratio(px / width);
    };

    return {
        bar1Px: bar1,
        bar2Px: bar2,
        setBar1Px,
        setBar2Px,
    };
}
