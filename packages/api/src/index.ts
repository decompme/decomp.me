import createClient from "openapi-fetch"
import type * as v1 from "./schema.d.ts"

export type paths = v1.paths

const client = createClient<paths>({
    baseUrl: "https://decomp.me/api",
    credentials: "include",
    headers: {
        accept: "application/json",
    },
})

export default client
