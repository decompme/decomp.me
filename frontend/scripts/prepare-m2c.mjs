import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
    copyFileSync,
    existsSync,
    mkdirSync,
    mkdtempSync,
    readFileSync,
    renameSync,
    rmSync,
    writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptRoot = dirname(fileURLToPath(import.meta.url));
const frontendRoot = resolve(scriptRoot, "..");
const repositoryRoot = resolve(frontendRoot, "..");
const pyprojectPath = join(repositoryRoot, "cromper", "pyproject.toml");
const workerTemplatePath = join(scriptRoot, "m2c", "worker.template.mjs");
const vendorParent = join(frontendRoot, "public", "vendor");
const outputRoot = join(vendorParent, "m2c");
const repository = "https://github.com/matt-kempster/m2c.git";
const pyodideVersion = "314.0.7";
const pyodideFiles = [
    "pyodide.mjs",
    "pyodide.asm.mjs",
    "pyodide.asm.wasm",
    "pyodide-lock.json",
    "python_stdlib.zip",
];

function run(command, args, cwd) {
    const result = spawnSync(command, args, {
        cwd,
        stdio: "inherit",
    });
    if (result.error) {
        throw new Error(`Unable to run ${command}: ${result.error.message}`);
    }
    if (result.status !== 0) {
        throw new Error(`${command} exited with status ${result.status}`);
    }
}

function m2cRevision() {
    const pyproject = readFileSync(pyprojectPath, "utf8");
    const pattern =
        /m2c\s*@\s*git\+https:\/\/github\.com\/matt-kempster\/m2c\.git@([0-9a-f]{40})/g;
    const revisions = [...pyproject.matchAll(pattern)].map((match) => match[1]);
    if (revisions.length !== 1) {
        throw new Error(
            `${pyprojectPath} must contain exactly one m2c dependency pinned to a full lowercase commit SHA`,
        );
    }
    return revisions[0];
}

function sha256(path) {
    return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function copyPyodideAssets() {
    const source = join(frontendRoot, "node_modules", "pyodide");
    const destination = join(vendorParent, "pyodide", pyodideVersion);
    mkdirSync(destination, { recursive: true });
    for (const file of pyodideFiles) {
        copyFileSync(join(source, file), join(destination, file));
    }
}

function currentOutputMatches(revision) {
    try {
        const manifest = JSON.parse(
            readFileSync(join(outputRoot, "manifest.json"), "utf8"),
        );
        const bundle = join(outputRoot, manifest.bundle);
        return (
            manifest.revision === revision &&
            manifest.bundle === "m2c.js" &&
            typeof manifest.sha256 === "string" &&
            existsSync(bundle) &&
            sha256(bundle) === manifest.sha256 &&
            existsSync(join(outputRoot, "worker.mjs"))
        );
    } catch {
        return false;
    }
}

function installOutput(stageRoot) {
    const backupRoot = `${outputRoot}.old-${process.pid}`;
    rmSync(backupRoot, { recursive: true, force: true });
    if (existsSync(outputRoot)) {
        renameSync(outputRoot, backupRoot);
    }
    try {
        renameSync(stageRoot, outputRoot);
        rmSync(backupRoot, { recursive: true, force: true });
    } catch (error) {
        if (existsSync(backupRoot) && !existsSync(outputRoot)) {
            renameSync(backupRoot, outputRoot);
        }
        throw error;
    }
}

function main() {
    copyPyodideAssets();
    const revision = m2cRevision();
    if (currentOutputMatches(revision)) {
        console.log(`m2c browser assets are up to date at ${revision}`);
        return;
    }

    mkdirSync(vendorParent, { recursive: true });
    const temporaryRoot = mkdtempSync(join(tmpdir(), "decompme-m2c-"));
    let stageRoot;
    try {
        const sourceRoot = join(temporaryRoot, "source");
        console.log(`Building m2c browser assets from ${revision}`);
        run("git", [
            "clone",
            "--quiet",
            "--no-checkout",
            repository,
            sourceRoot,
        ]);
        run("git", ["checkout", "--quiet", "--detach", revision], sourceRoot);

        // Use m2c's browser bundle builder, but skip its vendor downloader because
        // decomp.me already serves its own pinned Pyodide distribution.
        const buildBundle = `
from browser import build_bundle
build_bundle.update_vendor_files = lambda lock: None
build_bundle.write_vendor_paths = lambda lock: None
build_bundle.main()
`;
        run("python3", ["-c", buildBundle], sourceRoot);

        const upstreamBundlePath = join(
            sourceRoot,
            "browser",
            "dist",
            "m2c.js",
        );
        const upstreamBundle = readFileSync(upstreamBundlePath, "utf8");
        const assignment = "window.M2C_PYTHON_FILES = ";
        if (!upstreamBundle.startsWith(assignment)) {
            throw new Error(
                "Unexpected format from m2c's browser bundle builder",
            );
        }

        stageRoot = mkdtempSync(join(vendorParent, ".m2c-"));
        const bundlePath = join(stageRoot, "m2c.js");
        writeFileSync(
            bundlePath,
            `export const M2C_PYTHON_FILES = ${upstreamBundle.slice(assignment.length)}`,
        );

        const worker = readFileSync(workerTemplatePath, "utf8").replaceAll(
            "__M2C_REVISION__",
            revision,
        );
        writeFileSync(join(stageRoot, "worker.mjs"), worker);

        const checksum = sha256(bundlePath);
        writeFileSync(
            join(stageRoot, "manifest.json"),
            `${JSON.stringify({ revision, bundle: "m2c.js", sha256: checksum }, null, 4)}\n`,
        );
        writeFileSync(
            join(stageRoot, "README.txt"),
            `Generated by m2c's browser/build_bundle.py from ${repository} at ${revision}.\n` +
                `Bundle SHA-256: ${checksum}\n` +
                "Do not edit or commit this directory; run a frontend build to regenerate it.\n",
        );

        installOutput(stageRoot);
        stageRoot = undefined;
        console.log(`Built m2c browser bundle for ${revision}`);
    } finally {
        if (stageRoot) {
            rmSync(stageRoot, { recursive: true, force: true });
        }
        rmSync(temporaryRoot, { recursive: true, force: true });
    }
}

main();
