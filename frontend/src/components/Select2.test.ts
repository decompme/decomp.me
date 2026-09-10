import { beforeEach, describe, expect, it, vi } from "vitest";

const { runEffect } = vi.hoisted(() => ({ runEffect: vi.fn() }));
vi.mock("react", async (importOriginal) => ({
    ...(await importOriginal<typeof import("react")>()),
    useEffect: runEffect,
}));

import Select from "./Select2";

function renderSelection(options: Record<string, string>, value = "") {
    const onChange = vi.fn();
    Select({ options, value, onChange });
    runEffect.mock.lastCall[0]();
    return onChange;
}

beforeEach(() => runEffect.mockClear());

describe("Select default selection", () => {
    it("does not dispatch changes for a loading placeholder", () => {
        expect(renderSelection({ "": "Loading..." })).not.toHaveBeenCalled();
    });

    it("does not dispatch undefined when there are no options", () => {
        expect(renderSelection({})).not.toHaveBeenCalled();
    });

    it("selects the first compiler when options arrive", () => {
        expect(renderSelection({ gcc: "GCC" })).toHaveBeenCalledWith("gcc");
    });

    it("preserves an existing selection", () => {
        expect(
            renderSelection({ gcc: "GCC", ido: "IDO" }, "ido"),
        ).not.toHaveBeenCalled();
    });
});
