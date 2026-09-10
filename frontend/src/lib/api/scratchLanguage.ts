import { get, post } from "./request";
import type { Scratch, ScratchData } from "./types";

type LanguageResponse = {
    language: unknown;
};

export async function getScratch(url: string): Promise<Scratch> {
    const scratch: ScratchData = await get(url);
    return resolveScratchLanguage(scratch);
}

export async function resolveCompilerLanguage(
    compiler: string,
    compilerFlags: string,
): Promise<string> {
    const response: LanguageResponse = await post("/compiler/language", {
        compiler_id: compiler,
        compiler_flags: compilerFlags,
    });

    if (typeof response.language !== "string") {
        throw new Error("cromper returned an invalid compiler language");
    }

    return response.language;
}

export async function resolveScratchLanguage<
    T extends Pick<ScratchData, "compiler" | "compiler_flags">,
>(scratch: T): Promise<T & { language: string }> {
    const language = await resolveCompilerLanguage(
        scratch.compiler,
        scratch.compiler_flags,
    );
    return { ...scratch, language };
}
