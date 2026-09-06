import { beforeEach, describe, expect, it, vi } from "vitest";

import { post } from "./request";
import {
    resolveCompilerLanguage,
    resolveScratchLanguage,
} from "./scratchLanguage";

vi.mock("./request", () => ({
    post: vi.fn(),
}));

const mockedPost = vi.mocked(post);

describe("scratch language resolution", () => {
    beforeEach(() => {
        mockedPost.mockReset();
    });

    it("resolves a scratch language through cromper", async () => {
        mockedPost.mockResolvedValue({ language: "C++" });

        const scratch = {
            compiler: "ido7.1",
            compiler_flags: "-x c++",
            name: "Example",
        };
        const resolved = await resolveScratchLanguage(scratch);

        expect(mockedPost).toHaveBeenCalledWith("/compiler/language", {
            compiler_id: "ido7.1",
            compiler_flags: "-x c++",
        });
        expect(resolved).toEqual({ ...scratch, language: "C++" });
    });

    it("rejects an invalid cromper response", async () => {
        mockedPost.mockResolvedValue({ language: [] });

        await expect(resolveCompilerLanguage("ido7.1", "")).rejects.toThrow(
            "invalid compiler language",
        );
    });
});
