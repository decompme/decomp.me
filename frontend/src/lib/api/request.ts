import { notFound } from "next/navigation";

const API_BASE =
    process.env.INTERNAL_API_BASE ?? process.env.NEXT_PUBLIC_API_BASE;

if (!API_BASE) {
    console.log("process.env", process.env);
    throw new Error("No API_BASE set");
}

type Json = any;

const commonOpts: RequestInit = {
    credentials: "include",
    cache: "reload",
    headers: {
        Accept: "application/json",
    },
};

export class ResponseError extends Error {
    status: number;
    json: Json;
    code: string;

    constructor(response: Response, json: Json) {
        super(`Server responded with HTTP status code ${response.status}`);

        this.status = response.status;
        this.json = json;
        this.code = json.code;
        this.message = json?.detail;
        this.name = "ResponseError";
    }
}

export class RequestFailedError extends Error {
    constructor(message: string, url: string) {
        super(`${message} (occurred when fetching ${url})`);
        this.name = "RequestFailedError";
    }
}

export function normalizeUrl(url: string) {
    if (url.startsWith("/")) {
        url = API_BASE + url;
    }
    return url;
}

export async function errorHandledFetchJson(url: string, init?: RequestInit) {
    let response: Response;

    url = normalizeUrl(url);

    try {
        response = await fetch(url, init);
    } catch (error) {
        if (error instanceof TypeError) {
            throw new RequestFailedError(error.message, url);
        }

        throw error;
    }

    try {
        if (response.status === 502) {
            // We've received a "Gateway Unavailable" message from nginx.
            // The backend's down.
            throw new RequestFailedError("Backend gateway unavailable", url);
        }
        if (response.headers.get("X-Backend-Down") === "true") {
            // In order to prevent CloudFlare returning HTML when the backend
            // is unavailable, we return 200 with a custom header.
            throw new RequestFailedError("Backend is currently down", url);
        }

        if (!response.ok) {
            throw new ResponseError(response, await response.json());
        }

        if (response.status === 204) {
            return null;
        }

        return await response.json();
    } catch (error) {
        if (error instanceof SyntaxError) {
            throw new ResponseError(response, {
                code: "invalid_json",
                detail: "The server returned invalid JSON",
            });
        }

        throw error;
    }
}

export async function get(url: string) {
    console.info("GET", normalizeUrl(url));
    return await errorHandledFetchJson(url, {
        ...commonOpts,
        cache: "no-cache",
    });
}

export async function post(
    url: string,
    data: Json | FormData,
    method = "POST",
) {
    console.info(method, normalizeUrl(url), data);

    let body: string | FormData;
    if (data instanceof FormData) {
        body = data;
    } else {
        body = JSON.stringify(data);
    }

    return await errorHandledFetchJson(url, {
        ...commonOpts,
        method,
        body,
        headers:
            body instanceof FormData
                ? {}
                : {
                      "Content-Type": "application/json",
                  },
    });
}

export async function patch(url: string, data: Json | FormData) {
    return await post(url, data, "PATCH");
}

export async function delete_(url: string, json: Json) {
    return await post(url, json, "DELETE");
}

export async function put(url: string, json: Json) {
    return await post(url, json, "PUT");
}

/** Pass to Promise.catch to bubble 404 errors to the router */
export async function bubbleNotFound(error: any) {
    if (error instanceof ResponseError && error.status === 404) {
        notFound();
    }

    return Promise.reject(error);
}
