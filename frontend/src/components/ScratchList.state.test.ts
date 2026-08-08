import { describe, expect, it } from "vitest";

import {
    buildScratchListUrl,
    selectScratchPlatform,
    selectScratchPreset,
} from "./ScratchList.state";

describe("scratch list filters", () => {
    it("preserves existing parameters while adding ordering", () => {
        expect(
            buildScratchListUrl(
                "/scratch?page_size=20&has_owner=true",
                "-creation_time",
                {},
            ),
        ).toBe("/scratch?page_size=20&has_owner=true&ordering=-creation_time");
    });

    it("adds platform and preset filters to the request", () => {
        expect(
            buildScratchListUrl("/scratch", "match_percent", {
                platform: "n64",
                preset: 96,
            }),
        ).toBe("/scratch?ordering=match_percent&platform=n64&preset=96");
    });

    it("keeps a fixed preset from the base URL", () => {
        expect(
            buildScratchListUrl(
                "/scratch?preset=12&page_size=20",
                "-last_updated",
                {},
            ),
        ).toBe("/scratch?preset=12&page_size=20&ordering=-last_updated");
    });

    it("clears the preset when the platform changes", () => {
        expect(selectScratchPlatform("ps1")).toEqual({ platform: "ps1" });
        expect(selectScratchPlatform(undefined)).toEqual({});
    });

    it("preserves the platform when the preset changes", () => {
        expect(selectScratchPreset({ platform: "gba", preset: 3 }, 8)).toEqual({
            platform: "gba",
            preset: 8,
        });
        expect(
            selectScratchPreset({ platform: "gba", preset: 3 }, undefined),
        ).toEqual({ platform: "gba", preset: undefined });
    });
});
