import type {
    ClangdStdioTransport as ClangdStdioTransportType,
    CompileCommands,
} from "@decompme/clangd-wasm";

type InitMessage = {
    type: "init";
    compileCommands: CompileCommands;
    initialFileState: Record<string, string>;
};

type WorkerMessage =
    | { type: "prefetch" }
    | InitMessage
    | {
          type: "request";
          data: Parameters<ClangdStdioTransportType["sendData"]>[0];
      }
    | { type: "writeFile"; filename: string; contents: string }
    | { type: "close" };

type WorkerScope = {
    addEventListener(
        type: "message",
        listener: (event: MessageEvent<WorkerMessage>) => void,
    ): void;
    postMessage(message: unknown): void;
};

const workerScope = self as unknown as WorkerScope;
let transport: ClangdStdioTransportType;

workerScope.addEventListener("message", async (event) => {
    const message = event.data;

    if (message.type === "prefetch") {
        try {
            const { ClangdStdioTransport } = await import(
                "@decompme/clangd-wasm"
            );
            const response = await fetch(
                ClangdStdioTransport.getDefaultWasmURL(false),
            );
            if (!response.ok) {
                throw new Error(
                    `Failed to fetch clangd WASM: ${response.status} ${response.statusText}`,
                );
            }
            await response.arrayBuffer();
            workerScope.postMessage({ type: "prefetchComplete" });
        } catch (error) {
            workerScope.postMessage({
                type: "error",
                message: error instanceof Error ? error.message : String(error),
            });
        }
        return;
    }

    if (message.type === "init") {
        try {
            const { ClangdStdioTransport } = await import(
                "@decompme/clangd-wasm"
            );
            transport = new ClangdStdioTransport({
                compileCommands: message.compileCommands,
                initialFileState: message.initialFileState,
                useSmallBinary: false,
            });

            const module = transport.module;
            const onMessage = module.onMessageHook;
            module.onMessageHook = (data) => {
                onMessage(data);
                workerScope.postMessage({ type: "data", data });
            };

            const onExit = module.onExit.bind(module);
            module.onExit = () => {
                onExit();
                workerScope.postMessage({ type: "exited" });
            };

            await transport.connect();
            workerScope.postMessage({ type: "ready" });
        } catch (error) {
            workerScope.postMessage({
                type: "error",
                message: error instanceof Error ? error.message : String(error),
            });
        }
        return;
    }

    if (!transport) return;

    if (message.type === "request") {
        // The raw JSON-RPC response is forwarded by onMessageHook. The promise
        // rejects for JSON-RPC errors, so consume it without emitting a duplicate
        // transport error on the main thread.
        void transport
            .sendData(message.data)
            .catch((_error: unknown): undefined => undefined);
    } else if (message.type === "writeFile") {
        transport.module.FS.writeFile(message.filename, message.contents);
    } else if (message.type === "close") {
        transport.close();
    }
});
