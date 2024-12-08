declare module "is-dark-color" {
    interface isDarkColorOptions {
        override: { [hex: string]: boolean };
    }

    export default function isDarkColor(
        hexColor: string,
        options?: isDarkColorOptions,
    ): boolean;
}

declare module "use-persisted-state" {
    function createPersistedState<S>(
        key: string,
        storage?: Storage,
    ): (
        initialState: S | (() => S),
    ) => [S, React.Dispatch<React.SetStateAction<S>>];

    function createPersistedState<S = undefined>(
        key: string,
        storage?: Storage,
    ): (
        initialState: S | undefined,
    ) => [S | undefined, React.Dispatch<React.SetStateAction<S>>];

    export = createPersistedState;
}
