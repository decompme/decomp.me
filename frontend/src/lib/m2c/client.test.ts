import { afterEach, describe, expect, it, vi } from "vitest";
import {
    decompile,
    disposeM2CWorker,
    M2CWorkerClient,
    type M2CWorkerTransport,
} from "./client";
import type {
    M2CRequest,
    M2CWorkerRequest,
    M2CWorkerResponse,
} from "./protocol";

const request: M2CRequest = {
    asm: "glabel func\njr $ra\nnop",
    context: "",
    defaultSourceCode: "",
    platformId: "n64",
    target: "mips-gcc",
};

class FakeWorker implements M2CWorkerTransport {
    requests: M2CWorkerRequest[] = [];
    terminated = false;
    private messageListener?: (event: MessageEvent<M2CWorkerResponse>) => void;
    private errorListener?: (event: ErrorEvent) => void;

    addEventListener(
        type: "message" | "error",
        listener:
            | ((event: MessageEvent<M2CWorkerResponse>) => void)
            | ((event: ErrorEvent) => void),
    ): void {
        if (type === "message") {
            this.messageListener = listener as (
                event: MessageEvent<M2CWorkerResponse>,
            ) => void;
        } else {
            this.errorListener = listener as (event: ErrorEvent) => void;
        }
    }

    postMessage(message: M2CWorkerRequest): void {
        this.requests.push(message);
    }

    terminate(): void {
        this.terminated = true;
    }

    respond(response: M2CWorkerResponse): void {
        this.messageListener?.({ data: response } as MessageEvent);
    }
}

describe("M2CWorkerClient", () => {
    afterEach(() => {
        disposeM2CWorker();
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    it("matches out-of-order responses to their requests", async () => {
        const worker = new FakeWorker();
        const client = new M2CWorkerClient(worker);
        const first = client.decompile(request);
        const second = client.decompile({ ...request, asm: "second" });

        worker.respond({ id: worker.requests[1].id, ok: true, result: "two" });
        worker.respond({ id: worker.requests[0].id, ok: true, result: "one" });

        await expect(first).resolves.toBe("one");
        await expect(second).resolves.toBe("two");
    });

    it("rejects pending work when disposed", async () => {
        const worker = new FakeWorker();
        const client = new M2CWorkerClient(worker);
        const pending = client.decompile(request);

        client.dispose();

        await expect(pending).rejects.toThrow("disposed");
        expect(worker.terminated).toBe(true);
    });

    it("logs successful browser decompilation duration", async () => {
        let worker: FakeWorker | undefined;
        class StubWorker extends FakeWorker {
            constructor() {
                super();
                worker = this;
            }
        }
        vi.stubGlobal("Worker", StubWorker);
        const consoleInfo = vi
            .spyOn(console, "info")
            .mockImplementation(() => {});

        const pending = decompile(request);
        worker?.respond({ id: 1, ok: true, result: "decompiled" });

        await expect(pending).resolves.toBe("decompiled");
        expect(consoleInfo).toHaveBeenCalledWith(
            expect.stringMatching(
                /^\[m2c\] Decompilation for mips-gcc completed in \d+\.\d ms$/,
            ),
        );
    });
});
