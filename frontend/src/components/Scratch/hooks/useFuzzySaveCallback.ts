import { useCallback } from "react";

import * as api from "@/lib/api";

export enum FuzzySaveAction {
    SAVE = 0,
    FORK = 1,
    NONE = 2,
}

export default function useFuzzySaveCallback(
    scratch: api.Scratch,
    setScratch: (partial: Partial<api.Scratch>) => void,
): [FuzzySaveAction, () => Promise<void>] {
    const saveScratch = api.useSaveScratch(scratch);
    const forkScratch = api.useForkScratchAndGo(scratch);
    const userIsYou = api.useUserIsYou();

    let action = FuzzySaveAction.NONE;
    if (userIsYou(scratch.owner)) {
        action = FuzzySaveAction.SAVE;
    } else {
        action = FuzzySaveAction.FORK;
    }

    return [
        action,
        useCallback(async () => {
            switch (action) {
                case FuzzySaveAction.SAVE:
                    setScratch(await saveScratch());
                    break;
                case FuzzySaveAction.FORK:
                    await forkScratch();
                    break;
            }
        }, [action, forkScratch, saveScratch, setScratch]),
    ];
}
