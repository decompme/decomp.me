import type {
    M2CRequest,
    M2CWorkerRequest,
    M2CWorkerResponse,
} from "./protocol";

type MessageListener = (event: MessageEvent<M2CWorkerResponse>) => void;
type ErrorListener = (event: ErrorEvent) => void;

export interface M2CWorkerTransport {
    addEventListener(type: "message", listener: MessageListener): void;
    addEventListener(type: "error", listener: ErrorListener): void;
    postMessage(message: M2CWorkerRequest): void;
    terminate(): void;
}

type PendingRequest = {
    resolve: (result: string) => void;
    reject: (error: Error) => void;
};

export class M2CWorkerClient {
    private nextId = 1;
    private pending = new Map<number, PendingRequest>();
    private disposed = false;

    constructor(private readonly worker: M2CWorkerTransport) {
        worker.addEventListener("message", (event) => {
            const response = event.data;
            const pending = this.pending.get(response.id);
            if (!pending) return;

            this.pending.delete(response.id);
            if ("result" in response) {
                pending.resolve(response.result);
            } else {
                pending.reject(new Error(response.error));
            }
        });
        worker.addEventListener("error", (event) => {
            this.rejectAll(new Error(event.message || "m2c worker failed"));
        });
    }

    decompile(request: M2CRequest): Promise<string> {
        if (this.disposed) {
            return Promise.reject(new Error("m2c worker has been disposed"));
        }

        const id = this.nextId++;
        return new Promise((resolve, reject) => {
            this.pending.set(id, { resolve, reject });
            this.worker.postMessage({ id, ...request });
        });
    }

    dispose(): void {
        if (this.disposed) return;
        this.disposed = true;
        this.worker.terminate();
        this.rejectAll(new Error("m2c worker has been disposed"));
    }

    private rejectAll(error: Error): void {
        for (const request of this.pending.values()) {
            request.reject(error);
        }
        this.pending.clear();
    }
}

let sharedClient: M2CWorkerClient | null = null;
const M2C_WORKER_URL = "/vendor/m2c/worker.mjs";

export function isClientEnabled(): boolean {
    return typeof Worker !== "undefined" && typeof WebAssembly !== "undefined";
}

function getSharedClient(): M2CWorkerClient {
    if (!isClientEnabled()) {
        throw new Error("client-side m2c is unsupported");
    }
    if (!sharedClient) {
        sharedClient = new M2CWorkerClient(
            new Worker(M2C_WORKER_URL, {
                type: "module",
            }),
        );
    }
    return sharedClient;
}

export async function decompile(request: M2CRequest): Promise<string> {
    const startedAt = performance.now();
    try {
        const result = await getSharedClient().decompile(request);
        const duration = performance.now() - startedAt;
        console.info(
            `[m2c] Decompilation for ${request.target} completed in ${duration.toFixed(1)} ms`,
        );
        return result;
    } catch (error) {
        // A failed Pyodide initialization should not poison future attempts.
        disposeM2CWorker();
        throw error;
    }
}

export function disposeM2CWorker(): void {
    sharedClient?.dispose();
    sharedClient = null;
}
