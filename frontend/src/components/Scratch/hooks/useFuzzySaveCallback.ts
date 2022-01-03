import { useCallback } from "react"

import * as api from "../../../lib/api"

export enum FuzzySaveAction {
    CLAIM,
    SAVE,
    FORK,
    NONE,
}

export default function useFuzzySaveCallback(
    scratch: api.Scratch,
    setScratch: (partial: Partial<api.Scratch>) => void,
): [FuzzySaveAction, () => void] {
    const saveScratch = api.useSaveScratch(scratch)
    const forkScratch = api.useForkScratchAndGo(scratch)
    const userIsYou = api.useUserIsYou()

    let action = FuzzySaveAction.NONE
    if (!scratch.owner) {
        action = FuzzySaveAction.CLAIM
    } else if (userIsYou(scratch.owner)) {
        action = FuzzySaveAction.SAVE
    } else {
        action = FuzzySaveAction.FORK
    }

    return [
        action,
        useCallback(async () => {
            switch (action) {
            case FuzzySaveAction.CLAIM:
                await api.claimScratch(scratch)
                // fallthrough
            case FuzzySaveAction.SAVE:
                setScratch(await saveScratch())
                break
            case FuzzySaveAction.FORK:
                await forkScratch()
                break
            case FuzzySaveAction.NONE:
                break
            }
        }, [action, forkScratch, saveScratch, scratch, setScratch]),
    ]
}
