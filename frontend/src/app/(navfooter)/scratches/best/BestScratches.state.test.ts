import { describe, expect, it } from "vitest";

import type { PlatformBase, Preset } from "@/lib/api/types";

import {
    apiFractionToPercentString,
    parseDepthParam,
    parseOrderingParam,
    parsePlatformParam,
    parsePresetParam,
    parseSearchParam,
    percentStringToApiFraction,
    resolveDefaultPlatform,
    selectPresetId,
} from "./BestScratches.state";

function platforms(
    ids: string[] = ["saturn", "n64"],
): Record<string, PlatformBase> {
    const result: Record<string, PlatformBase> = {};
    for (const id of ids) {
        result[id] = {
            id,
            name: id,
            description: "",
            arch: "",
            has_decompiler: false,
        };
    }
    return result;
}

function preset(overrides: Partial<Preset> = {}): Preset {
    return {
        id: 1,
        name: "Preset",
        platform: "saturn",
        compiler: "cygnus-2.7-96Q3",
        compiler_flags: "",
        diff_flags: [],
        libraries: [],
        assembler_flags: "",
        decompiler_flags: "",
        num_scratches: 0,
        owner: null,
        ...overrides,
    };
}

describe("parsePlatformParam", () => {
    it("accepts a platform id present in the available platforms", () => {
        expect(parsePlatformParam(platforms(), "saturn")).toBe("saturn");
    });

    it("rejects a platform id not present in the available platforms", () => {
        expect(
            parsePlatformParam(platforms(), "not-a-platform"),
        ).toBeUndefined();
    });

    it("rejects a missing platform param", () => {
        expect(parsePlatformParam(platforms(), undefined)).toBeUndefined();
    });
});

describe("parsePresetParam", () => {
    it("accepts a positive integer string", () => {
        expect(parsePresetParam("1")).toBe(1);
        expect(parsePresetParam("42")).toBe(42);
    });

    it("rejects non-numeric, zero, negative, and missing values", () => {
        expect(parsePresetParam("not-a-number")).toBeUndefined();
        expect(parsePresetParam("0")).toBeUndefined();
        expect(parsePresetParam("-1")).toBeUndefined();
        expect(parsePresetParam("1.5")).toBeUndefined();
        expect(parsePresetParam(undefined)).toBeUndefined();
    });
});

describe("resolveDefaultPlatform", () => {
    it("uses a valid initial platform from the URL", () => {
        expect(resolveDefaultPlatform(platforms(), "n64")).toBe("n64");
    });

    it("falls back to saturn when no valid initial platform is given", () => {
        expect(resolveDefaultPlatform(platforms(), undefined)).toBe("saturn");
    });

    it("ignores an initial platform that isn't available", () => {
        expect(resolveDefaultPlatform(platforms(), "not-a-platform")).toBe(
            "saturn",
        );
    });

    it("falls back to the first available platform when saturn is absent", () => {
        expect(
            resolveDefaultPlatform(platforms(["n64", "gc_wii"]), undefined),
        ).toBe("n64");
    });
});

describe("selectPresetId", () => {
    it("keeps a preset id that is present in the loaded presets", () => {
        const presets = [preset({ id: 5 }), preset({ id: 9 })];
        expect(selectPresetId(presets, 9)).toBe(9);
    });

    it("keeps the id from a direct /scratches/best?platform=saturn&preset=<id> link", () => {
        const sotnId = 9;
        const presets = [
            preset({ id: 5, name: "Other" }),
            preset({ id: sotnId, name: "SOTN" }),
        ];
        expect(selectPresetId(presets, sotnId)).toBe(sotnId);
    });

    it("falls back to the first preset when the current id isn't in the list", () => {
        const presets = [preset({ id: 5 }), preset({ id: 9 })];
        expect(selectPresetId(presets, 123)).toBe(5);
    });

    it("falls back to the first preset when no id is selected yet", () => {
        const presets = [preset({ id: 5 }), preset({ id: 9 })];
        expect(selectPresetId(presets, null)).toBe(5);
    });

    it("returns null when there are no presets for the platform", () => {
        expect(selectPresetId([], 5)).toBeNull();
    });

    it("leaves the current id untouched while presets are still loading", () => {
        expect(selectPresetId(undefined, 5)).toBe(5);
    });
});

describe("parseDepthParam", () => {
    it("accepts a supported depth", () => {
        expect(parseDepthParam("10")).toBe("10");
    });

    it("falls back to the default for missing or unsupported depths", () => {
        expect(parseDepthParam(undefined)).toBe("1");
        expect(parseDepthParam("7")).toBe("1");
        expect(parseDepthParam("not-a-number")).toBe("1");
    });
});

describe("parseOrderingParam", () => {
    it("accepts a supported ordering", () => {
        expect(parseOrderingParam("latest")).toBe("latest");
    });

    it("falls back to the default for missing or unsupported orderings", () => {
        expect(parseOrderingParam(undefined)).toBe("best_match");
        expect(parseOrderingParam("-best_match")).toBe("best_match");
    });
});

describe("parseSearchParam", () => {
    it("trims whitespace", () => {
        expect(parseSearchParam("  func_a  ")).toBe("func_a");
    });

    it("returns an empty string for a missing param", () => {
        expect(parseSearchParam(undefined)).toBe("");
    });
});

describe("percentStringToApiFraction / apiFractionToPercentString", () => {
    it("round-trips a normal percentage", () => {
        expect(percentStringToApiFraction("50")).toBe("0.5");
        expect(apiFractionToPercentString("0.5")).toBe("50");
    });

    it("clamps values above 100 or below 0 before they reach the API", () => {
        expect(percentStringToApiFraction("101")).toBe("1");
        expect(percentStringToApiFraction("-1")).toBe("0");
    });

    it("clamps a fraction outside 0.0-1.0 read back from the URL", () => {
        expect(apiFractionToPercentString("1.5")).toBe("100");
        expect(apiFractionToPercentString("-0.2")).toBe("0");
    });

    it("rejects non-finite values instead of sending them to the API", () => {
        expect(percentStringToApiFraction("nan")).toBeUndefined();
        expect(percentStringToApiFraction("Infinity")).toBeUndefined();
        expect(apiFractionToPercentString("nan")).toBe("");
    });

    it("treats empty/missing values as no filter", () => {
        expect(percentStringToApiFraction("")).toBeUndefined();
        expect(percentStringToApiFraction("   ")).toBeUndefined();
        expect(apiFractionToPercentString(undefined)).toBe("");
    });
});

describe("direct navigation with a fully-specified query string", () => {
    it("reproduces every filter from ?platform=saturn&preset=9&depth=10&ordering=name&min_match=0.5&search=func", () => {
        const availablePlatforms = platforms();
        const query = new URLSearchParams(
            "platform=saturn&preset=9&depth=10&ordering=name&min_match=0.5&search=func",
        );

        expect(
            parsePlatformParam(
                availablePlatforms,
                query.get("platform") ?? undefined,
            ),
        ).toBe("saturn");
        expect(parsePresetParam(query.get("preset") ?? undefined)).toBe(9);
        expect(parseDepthParam(query.get("depth") ?? undefined)).toBe("10");
        expect(parseOrderingParam(query.get("ordering") ?? undefined)).toBe(
            "name",
        );
        expect(
            apiFractionToPercentString(query.get("min_match") ?? undefined),
        ).toBe("50");
        expect(parseSearchParam(query.get("search") ?? undefined)).toBe("func");
    });
});
