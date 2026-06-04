import { describe, expect, it, vi } from "vitest";

import { parseStorageValue } from "./storage";

describe("parseStorageValue", () => {
    it("parses JSON values", () => {
        expect(parseStorageValue("theme", '"dark"')).toBe("dark");
        expect(parseStorageValue("autoRecompile", "true")).toBe(true);
        expect(parseStorageValue("autoRecompileDelay", "500")).toBe(500);
    });

    it("accepts legacy raw string values", () => {
        expect(parseStorageValue("theme", "auto")).toBe("auto");
        expect(parseStorageValue("codeColorScheme", "Frog Dark")).toBe(
            "Frog Dark",
        );
    });

    it("rejects malformed structured JSON", () => {
        const consoleError = vi
            .spyOn(console, "error")
            .mockImplementation(() => {});

        expect(parseStorageValue("someObject", "{bad")).toBeUndefined();
        expect(consoleError).toHaveBeenCalledOnce();

        consoleError.mockRestore();
    });
});
