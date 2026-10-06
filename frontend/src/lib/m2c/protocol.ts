export type M2CRequest = {
    asm: string;
    context: string;
    defaultSourceCode: string;
    platformId: string;
    target: string;
};

export type M2CWorkerRequest = M2CRequest & {
    id: number;
};

export type M2CWorkerResponse =
    | { id: number; ok: true; result: string }
    | { id: number; ok: false; error: string };
