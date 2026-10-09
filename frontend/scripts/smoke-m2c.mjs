import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { loadPyodide } from "pyodide";

const vendorRoot = join("public", "vendor", "m2c");
const m2cRoot = "/opt/decompme-m2c";

function readPythonFiles(bundle) {
    const assignment = "export const M2C_PYTHON_FILES = ";
    assert.ok(bundle.startsWith(assignment));
    const value = bundle.slice(assignment.length).trim();
    assert.ok(value.endsWith(";"));
    return JSON.parse(value.slice(0, -1));
}

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

function installM2C(pyodide, files) {
    for (const [path, source] of Object.entries(files)) {
        const fullPath = `${m2cRoot}/${path}`;
        mkdirp(pyodide, fullPath.split("/").slice(0, -1).join("/"));
        pyodide.FS.writeFile(fullPath, source, { encoding: "utf8" });
    }
    pyodide.runPython(
        `import sys\nsys.path.insert(0, ${JSON.stringify(m2cRoot)})\nsys.setrecursionlimit(min(2**31 - 1, 10 * sys.getrecursionlimit()))`,
    );
}

function decompile(pyodide, decompileForBrowser, source, context, target) {
    const flags = pyodide.toPy([
        "--stop-on-error",
        "--pointer-style=left",
        `--target=${target}`,
    ]);
    let result;
    try {
        result = decompileForBrowser(source, context, flags);
        return {
            returncode: Number(result.returncode),
            output: String(result.output),
        };
    } finally {
        result?.destroy();
        flags.destroy();
    }
}

async function main() {
    const manifest = JSON.parse(
        await readFile(join(vendorRoot, "manifest.json"), "utf8"),
    );
    const bundle = await readFile(join(vendorRoot, manifest.bundle), "utf8");
    const pyodide = await loadPyodide();
    installM2C(pyodide, readPythonFiles(bundle));

    const mainModule = pyodide.pyimport("m2c.main");
    const decompileForBrowser = mainModule.decompile_for_browser;
    try {
        const mips = decompile(
            pyodide,
            decompileForBrowser,
            "glabel return_2\njr $ra\nli $v0,2",
            "",
            "mips-gcc",
        );
        assert.equal(mips.returncode, 0);
        assert.match(mips.output, /return 2;/);

        const ppc = decompile(
            pyodide,
            decompileForBrowser,
            ".global func_800B43A8\nfunc_800B43A8:\nxor r0, r3, r3\nsubf r3, r4, r0\nblr",
            "",
            "ppc-mwcc",
        );
        assert.equal(ppc.returncode, 0);
        assert.equal(
            ppc.output,
            "s32 func_800B43A8(s32 arg0, s32 arg1) {\n    return (arg0 ^ arg0) - arg1;\n}\n",
        );

        const sh2 = decompile(
            pyodide,
            decompileForBrowser,
            ".global test\ntest:\nmov.l r14,@-r15\nmov r15,r14\nmov.l @r15+,r14\nrts\nmov #1,r0",
            "",
            "sh2-gcc",
        );
        assert.equal(sh2.returncode, 0);
        assert.equal(sh2.output, "s32 test(void) {\n    return 1;\n}\n");

        const contextFailure = decompile(
            pyodide,
            decompileForBrowser,
            "glabel return_2\njr $ra\nli $v0,2",
            "typedeff jeff;",
            "mips-gcc",
        );
        assert.notEqual(contextFailure.returncode, 0);
        const fallback = decompile(
            pyodide,
            decompileForBrowser,
            "glabel return_2\njr $ra\nli $v0,2",
            "",
            "mips-gcc",
        );
        assert.equal(fallback.returncode, 0);
        assert.match(fallback.output, /return 2;/);
    } finally {
        decompileForBrowser.destroy();
        mainModule.destroy();
    }

    console.log("m2c Pyodide bundle smoke tests passed");
}

main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
});
