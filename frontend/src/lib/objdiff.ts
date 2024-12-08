import { runDiff } from "objdiff-wasm";

import type { Compilation } from "./api/types";

function base64ToBytes(base64: string) {
    const binString = atob(base64);
    return Uint8Array.from(binString, (m) => m.codePointAt(0));
}

export async function runObjdiff(
    compilation: Compilation,
): Promise<Compilation> {
    const leftObject = base64ToBytes(compilation.left_object);
    const rightObject = base64ToBytes(compilation.right_object);
    const output = await runDiff(leftObject, rightObject);
    compilation.objdiff_output = output;
    return compilation;
}
