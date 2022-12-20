const API_BASE = process.env.INTERNAL_API_BASE ?? process.env.NEXT_PUBLIC_API_BASE

type Json = any

const commonOpts: RequestInit = {
    credentials: "include",
    cache: "reload",
    headers: {
        "Accept": "application/json",
    },
}

export class ResponseError extends Error {
    status: number
    json: Json
    code: string

    constructor(response: Response, json) {
        super(`Server responded with HTTP status code ${response.status}`)

        this.status = response.status
        this.json = json
        this.code = json.code
        this.message = json?.detail
        this.name = "ResponseError"
    }
}

export function normalizeUrl(url: string) {
    if (url.startsWith("/")) {
        url = API_BASE + url
    }
    return url
}

export async function get(url: string, useCacheIfFresh = false) {
    url = normalizeUrl(url)

    const response = await fetch(url, {
        ...commonOpts,
        cache: useCacheIfFresh ? "default" : "no-cache",
        next: { revalidate: 10 },
    })

    if (!response.ok) {
        throw new ResponseError(response, await response.json())
    }

    try {
        return await response.json()
    } catch (error) {
        if (error instanceof SyntaxError) {
            throw new ResponseError(response, {
                code: "invalid_json",
                detail: "The server returned invalid JSON",
            })
        }

        throw error
    }
}

export const getCached = (url: string) => get(url, true)

export async function post(url: string, data: Json | FormData, method = "POST") {
    url = normalizeUrl(url)

    console.info(method, url, data)

    let body: string | FormData
    if (data instanceof FormData) {
        body = data
    } else {
        body = JSON.stringify(data)
    }

    const response = await fetch(url, {
        ...commonOpts,
        method,
        body,
        headers: body instanceof FormData ? {} : {
            "Content-Type": "application/json",
        },
    })

    if (!response.ok) {
        throw new ResponseError(response, await response.json())
    }

    if (response.status == 204) {
        return null
    } else {
        return await response.json()
    }
}

export async function patch(url: string, data: Json | FormData) {
    return await post(url, data, "PATCH")
}

export async function delete_(url: string, json: Json) {
    return await post(url, json, "DELETE")
}

export async function put(url: string, json: Json) {
    return await post(url, json, "PUT")
}
