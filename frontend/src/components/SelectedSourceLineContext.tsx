import { createContext, useContext, useState, useMemo } from "react";

type SelectedSourceLineContextValue = {
    selectedSourceLine: number | null;
    setSelectedSourceLine: (line: number | null) => void;
};

const SelectedSourceLineContext = createContext<
    SelectedSourceLineContextValue | undefined
>(undefined);

export function SelectedSourceLineProvider({
    children,
}: { children: React.ReactNode }) {
    const [selectedSourceLine, setSelectedSourceLine] = useState<number | null>(
        null,
    );

    const value = useMemo(
        () => ({ selectedSourceLine, setSelectedSourceLine }),
        [selectedSourceLine],
    );

    return (
        <SelectedSourceLineContext.Provider value={value}>
            {children}
        </SelectedSourceLineContext.Provider>
    );
}

export function useSelectedSourceLine() {
    const ctx = useContext(SelectedSourceLineContext);
    if (!ctx)
        throw new Error(
            "useSelectedSourceLine must be used within SelectedSourceLineProvider",
        );
    return ctx;
}
