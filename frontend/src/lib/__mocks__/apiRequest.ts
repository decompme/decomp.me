const API_BASE = "/api"

type Json = Record<string, unknown>

const fail = (e: string) => {
    throw new Error(e)
}

if (!global.getHandlers) {
    global.getHandlers = {}
    global.postHandlers = {}
    global.patchHandlers = {}
}

export function mockGet(url: string, json: Json) {
    const handler = jest.fn((_url: string, _useCacheIfFresh: boolean) => Promise.resolve(json))
    global.getHandlers[url] = handler
    return handler
}

export async function get(url: string, useCacheIfFresh = false) {
    if (url.startsWith("/")) {
        url = API_BASE + url
    }

    let handler = global.getHandlers[url]

    if (!handler)
        handler = global.getHandlers["*"]
    if (!handler)
        fail(`No mock handler for GET ${url}`)

    return handler(url, useCacheIfFresh)
}

export async function post(url: string, json: Json) {
    if (url.startsWith("/")) {
        url = API_BASE + url
    }

    let handler = global.postHandlers[url]

    if (!handler)
        handler = global.postHandlers["*"]
    if (!handler)
        fail(`No mock handler for POST ${url}`)

    return handler(url, json)
}

export async function patch(url: string, json: Json) {
    if (url.startsWith("/")) {
        url = API_BASE + url
    }

    let handler = global.patchHandlers[url]

    if (!handler)
        handler = global.patchHandlers["*"]
    if (!handler)
        fail(`No mock handler for PATCH ${url}`)

    return handler(url, json)
}
