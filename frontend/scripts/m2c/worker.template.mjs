import { M2C_PYTHON_FILES } from "/vendor/m2c/m2c.js";
import { loadPyodide } from "/vendor/pyodide/314.0.0/pyodide.mjs";

const M2C_REVISION = "__M2C_REVISION__";
const M2C_ROOT = "/opt/decompme-m2c";
const MAX_M2C_ASM_LINES = 15000;
const DECOMP_WITH_CONTEXT_FAILED_PREAMBLE =
    "/* Decompilation with context failed; here's the decompilation without context: */";

function mkdirp(pyodide, path) {
    let current = "";
    for (const part of path.split("/")) {
        if (!part) continue;
        current += `/${part}`;
        if (!pyodide.FS.analyzePath(current).exists) {
            pyodide.FS.mkdir(current);
        }
    }
}

function installM2C(pyodide) {
    for (const [path, source] of Object.entries(M2C_PYTHON_FILES)) {
        const fullPath = `${M2C_ROOT}/${path}`;
        mkdirp(pyodide, fullPath.split("/").slice(0, -1).join("/"));
        pyodide.FS.writeFile(fullPath, source, { encoding: "utf8" });
    }
    pyodide.runPython(
        `import sys\nsys.path.insert(0, ${JSON.stringify(M2C_ROOT)})\nsys.setrecursionlimit(min(2**31 - 1, 10 * sys.getrecursionlimit()))`,
    );
}

async function loadM2C() {
    const pyodide = await loadPyodide({
        indexURL: "/vendor/pyodide/314.0.0/",
    });
    installM2C(pyodide);

    const mainModule = pyodide.pyimport("m2c.main");
    return {
        pyodide,
        mainModule,
        decompileForBrowser: mainModule.decompile_for_browser,
    };
}

function runM2C(runtime, source, context, target) {
    const flags = runtime.pyodide.toPy([
        "--stop-on-error",
        "--pointer-style=left",
        `--target=${target}`,
    ]);
    let result;
    try {
        result = runtime.decompileForBrowser(source, context, flags);
        return {
            returncode: Number(result.returncode),
            output: String(result.output),
        };
    } finally {
        result?.destroy();
        flags.destroy();
    }
}

let m2cPromise;

async function decompile(request) {
    if (request.asm.split("\n").length > MAX_M2C_ASM_LINES) {
        return "/* Too many lines to decompile; please run m2c manually */";
    }

    let source = request.asm;
    if (request.platformId === "gba" && source.includes("thumb_func_start")) {
        source = `.syntax unified\n${source}`;
    }

    m2cPromise ??= loadM2C();
    const runtime = await m2cPromise;
    const result = runM2C(runtime, source, request.context, request.target);
    if (result.returncode === 0) {
        return result.output;
    }

    const fallback = runM2C(runtime, source, "", request.target);
    if (fallback.returncode === 0) {
        return `${result.output}\n${DECOMP_WITH_CONTEXT_FAILED_PREAMBLE}\n\n${fallback.output}`;
    }
    return `${result.output}\n${fallback.output}\n${request.defaultSourceCode}`;
}

self.addEventListener("message", async (event) => {
    const request = event.data;
    let response;
    try {
        response = {
            id: request.id,
            ok: true,
            result: await decompile(request),
        };
    } catch (error) {
        response = {
            id: request.id,
            ok: false,
            error:
                error instanceof Error
                    ? `${error.message} (m2c ${M2C_REVISION})`
                    : String(error),
        };
    }
    self.postMessage(response);
});
