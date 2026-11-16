import type { CompileCommands } from "@decompme/clangd-wasm";
import { ERR_UNKNOWN, JSONRPCError } from "@open-rpc/client-js/build/Error";
import type { JSONRPCRequestData } from "@open-rpc/client-js/build/Request";
import { getNotifications } from "@open-rpc/client-js/build/Request";
import { Transport } from "@open-rpc/client-js/build/transports/Transport";

type WorkerResponse =
    | { type: "prefetchComplete" }
    | { type: "ready" }
    | { type: "data"; data: string }
    | { type: "error"; message: string }
    | { type: "exited" };

export class ClangdWorkerTransport extends Transport {
    private worker: Worker;
    private readyPromise: Promise<void>;
    private resolveReady: () => void;
    private rejectReady: (error: Error) => void;
    private closeTimeout: ReturnType<typeof setTimeout>;
    private closed = false;

    constructor(
        compileCommands: CompileCommands,
        initialFileState: Record<string, string>,
    ) {
        super();
        this.worker = new Worker(
            new URL("./clangd.worker.ts", import.meta.url),
            { type: "module" },
        );
        this.readyPromise = new Promise((resolve, reject) => {
            this.resolveReady = resolve;
            this.rejectReady = reject;
        });
        this.worker.addEventListener("message", this.handleMessage);
        this.worker.addEventListener("error", this.handleWorkerError);
        this.worker.postMessage({
            type: "init",
            compileCommands,
            initialFileState,
        });
    }

    connect() {
        return this.readyPromise;
    }

    close() {
        if (this.closed || this.closeTimeout) return;
        this.worker.postMessage({ type: "close" });
        this.closeTimeout = setTimeout(() => this.terminate(), 2000);
    }

    sendData(data: JSONRPCRequestData, timeout?: number | null) {
        const response = this.transportRequestManager.addRequest(data, timeout);
        void this.readyPromise.then(
            () => {
                this.worker.postMessage({ type: "request", data });
                this.transportRequestManager.settlePendingRequest(
                    getNotifications(data),
                );
            },
            (error: Error) => {
                const requests = Array.isArray(data)
                    ? data.map(({ request }) => request)
                    : [data];
                this.transportRequestManager.settlePendingRequest(
                    requests,
                    error,
                );
            },
        );
        return response;
    }

    writeFile(filename: string, contents: string) {
        this.worker.postMessage({ type: "writeFile", filename, contents });
    }

    private handleMessage = (event: MessageEvent<WorkerResponse>) => {
        const response = event.data;
        if (response.type === "ready") {
            this.resolveReady();
        } else if (response.type === "data") {
            this.transportRequestManager.resolveResponse(response.data);
        } else if (response.type === "error") {
            const error = new JSONRPCError(response.message, ERR_UNKNOWN);
            this.rejectReady(error);
            this.transportRequestManager.transportEventChannel.emit(
                "error",
                error,
            );
        } else if (response.type === "exited") {
            this.terminate();
        }
    };

    private handleWorkerError = (event: ErrorEvent) => {
        const error = new JSONRPCError(event.message, ERR_UNKNOWN);
        this.rejectReady(error);
        this.transportRequestManager.transportEventChannel.emit("error", error);
    };

    private terminate() {
        if (this.closed) return;
        this.closed = true;
        clearTimeout(this.closeTimeout);
        this.worker.terminate();
    }
}

export function prefetchClangdWasm() {
    return new Promise<void>((resolve, reject) => {
        const worker = new Worker(
            new URL("./clangd.worker.ts", import.meta.url),
            { type: "module" },
        );
        const cleanup = () => worker.terminate();

        worker.addEventListener(
            "message",
            (event: MessageEvent<WorkerResponse>) => {
                if (event.data.type === "prefetchComplete") {
                    cleanup();
                    resolve();
                } else if (event.data.type === "error") {
                    cleanup();
                    reject(new Error(event.data.message));
                }
            },
        );
        worker.addEventListener("error", (event) => {
            cleanup();
            reject(new Error(event.message));
        });
        worker.postMessage({ type: "prefetch" });
    });
}
