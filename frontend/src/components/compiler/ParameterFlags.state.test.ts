import { describe, expect, it } from "vitest";

import {
    isValidHexParameterValue,
    isValidIntegerParameterValue,
    isValidIntOrHexParameterValue,
} from "./ParameterFlags.state";

describe("integer parameter validation", () => {
    it("accepts integers and trims whitespace", () => {
        expect(isValidIntegerParameterValue(" 42 ")).toBe(true);
    });

    it("rejects empty and decimal values", () => {
        expect(isValidIntegerParameterValue("")).toBe(false);
        expect(isValidIntegerParameterValue("1.5")).toBe(false);
    });

    it("rejects negative values unless allowed", () => {
        expect(isValidIntegerParameterValue("-1")).toBe(false);
        expect(isValidIntegerParameterValue("-1", true)).toBe(true);
    });
});

describe("hex parameter validation", () => {
    it("accepts prefixed hex values", () => {
        expect(isValidHexParameterValue("0x10")).toBe(true);
        expect(isValidHexParameterValue("0xCAFE")).toBe(true);
    });

    it("rejects non-hex and empty values", () => {
        expect(isValidHexParameterValue("10")).toBe(false);
        expect(isValidHexParameterValue("0x")).toBe(false);
        expect(isValidHexParameterValue("")).toBe(false);
    });

    it("rejects negative hex values unless allowed", () => {
        expect(isValidHexParameterValue("-0x10")).toBe(false);
        expect(isValidHexParameterValue("-0x10", true)).toBe(true);
    });
});

describe("int-or-hex parameter validation", () => {
    it("accepts integer and prefixed hex values", () => {
        expect(isValidIntOrHexParameterValue("4096")).toBe(true);
        expect(isValidIntOrHexParameterValue("0x1000")).toBe(true);
    });

    it("rejects empty or invalid values", () => {
        expect(isValidIntOrHexParameterValue("")).toBe(false);
        expect(isValidIntOrHexParameterValue("wat")).toBe(false);
    });

    it("rejects negative values unless allowed", () => {
        expect(isValidIntOrHexParameterValue("-4096")).toBe(false);
        expect(isValidIntOrHexParameterValue("-4096", true)).toBe(true);
        expect(isValidIntOrHexParameterValue("-0x1000", true)).toBe(true);
    });
});
