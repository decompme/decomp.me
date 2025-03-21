import { useState, useEffect } from "react";

// Registry of subscribers per storage key
type Subscriber<T> = (newValue: T | undefined) => void;
type SubscriberSet<T = unknown> = Set<Subscriber<T>>;
const storageSubscribers = new Map<string, SubscriberSet>();

// Memoized storage values to allow shallow comparison
const storageCache = new Map<string, unknown>();

function notifySubscribers<T>(key: string, value: T | undefined) {
    if (value === undefined) {
        storageCache.delete(key);
    } else {
        storageCache.set(key, value);
    }
    const subscribers = storageSubscribers.get(key) as
        | SubscriberSet<T>
        | undefined;
    if (subscribers) {
        for (const callback of subscribers) {
            callback(value);
        }
    }
}

let storage: {
    getItem: <T>(key: string) => T | undefined;
    setItem: <T>(key: string, value: T | undefined) => void;
};
if (localStorageAvailable()) {
    storage = {
        getItem: <T>(key: string) => {
            let item = storageCache.get(key) as T | undefined;
            if (item !== undefined) {
                return item;
            }
            const serialized = localStorage.getItem(key);
            if (serialized !== null) {
                try {
                    item = JSON.parse(serialized) as T;
                    storageCache.set(key, item);
                    return item;
                } catch (err) {
                    console.error(
                        `Failed to parse localStorage for key "${key}":`,
                        err,
                    );
                }
            }
            return undefined;
        },
        setItem: (key, value) => {
            try {
                if (value === undefined) {
                    localStorage.removeItem(key);
                } else {
                    localStorage.setItem(key, JSON.stringify(value));
                }
            } catch (err) {
                console.error(`Error setting localStorage key "${key}":`, err);
            }
            notifySubscribers(key, value);
        },
    };

    // Listen for changes in other tabs
    window.addEventListener("storage", (event) => {
        if (event.key === null) {
            // Storage cleared
            for (const key of storageSubscribers.keys()) {
                notifySubscribers(key, undefined);
            }
        } else if (storageSubscribers.has(event.key)) {
            let value: unknown;
            if (event.newValue !== null) {
                try {
                    value = JSON.parse(event.newValue);
                } catch (err) {
                    console.error(
                        `Failed to parse localStorage for key "${event.key}":`,
                        err,
                    );
                }
            }
            notifySubscribers(event.key, value);
        }
    });
} else {
    storage = {
        getItem: <T>(key: string) => storageCache.get(key) as T | undefined,
        setItem: (key, value) => notifySubscribers(key, value),
    };
}

// Constraints for JSON-compatible values
export type JSONValue =
    | string
    | number
    | boolean
    | null
    | JSONValue[]
    | { [key: string]: JSONValue };

// Action to update storage value
// undefined resets to default value
export type SetStorageAction<T> = T | ((value: T) => T | undefined) | undefined;

export function createStorageKey<T extends JSONValue>(
    key: string,
    defaultValue: T,
) {
    let subscribers = storageSubscribers.get(key) as
        | SubscriberSet<T>
        | undefined;
    if (subscribers === undefined) {
        subscribers = new Set();
        storageSubscribers.set(key, subscribers as SubscriberSet);
    }

    const withDefault = (value: T | undefined): T =>
        value === undefined ? defaultValue : value;

    const setStorageValue = (value: SetStorageAction<T>) => {
        const item = storage.getItem<T>(key);
        const current = withDefault(item);
        const newValue = typeof value === "function" ? value(current) : value;
        // If newValue is undefined, clear the item if it exists
        // Otherwise, only update if the effective value has changed
        if (
            newValue === undefined ? item !== undefined : newValue !== current
        ) {
            storage.setItem(key, newValue);
        }
    };

    return function useStorageValue(): [
        Readonly<T>,
        React.Dispatch<SetStorageAction<T>>,
    ] {
        const [value, setValue] = useState<T>(() =>
            withDefault(storage.getItem<T>(key)),
        );

        useEffect(() => {
            const subscriber = (newValue: T | undefined) =>
                setValue(withDefault(newValue));
            subscribers.add(subscriber);
            return () => {
                subscribers.delete(subscriber);
            };
        }, []);

        return [value, setStorageValue];
    };
}

// https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API/Using_the_Web_Storage_API#feature-detecting_localstorage
function localStorageAvailable() {
    let storage: typeof window.localStorage | null = null;
    try {
        storage = window.localStorage;
        const x = "__storage_test__";
        storage.setItem(x, x);
        storage.removeItem(x);
        return true;
    } catch (e) {
        return (
            e instanceof DOMException &&
            e.name === "QuotaExceededError" &&
            // acknowledge QuotaExceededError only if there's something already stored
            storage &&
            storage.length !== 0
        );
    }
}
