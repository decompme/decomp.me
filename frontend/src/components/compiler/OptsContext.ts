import { createContext } from "react";

interface IOptsContext {
    checkFlag(flag: string): boolean;
    setFlag(flag: string, value: boolean): void;
    setFlags(edits: { flag: string; value: boolean }[]): void;
    getFlagValue?: (flag: string) => string | undefined;
}

export const OptsContext = createContext<IOptsContext>(undefined);
