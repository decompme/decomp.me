const { API_BASE } = import.meta.env

type Json = Record<string, unknown>

const commonOpts: RequestInit = {
    credentials: "include",
    cache: "reload",
}

// Read the Django CSRF token, from https://docs.djangoproject.com/en/3.2/ref/csrf/#ajax
export const csrftoken = (function (name) {
    let cookieValue = null
    if (document.cookie && document.cookie !== "") {
        const cookies = document.cookie.split(";")
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim()
            // Does this cookie string begin with the name we want?
            if (cookie.substring(0, name.length + 1) === (`${name  }=`)) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1))
                break
            }
        }
    }
    return cookieValue
})("csrftoken")

export class ResponseError extends Error {
    responseJSON: Json

    constructor(response: Response, responseJSON) {
        super(`Server responded with HTTP status code ${response.status}`)

        this.responseJSON = responseJSON

        if (responseJSON.error) {
            this.message = responseJSON.error
        } else if (responseJSON.errors) {
            this.message = responseJSON.errors.join(",")
        }

        this.name = "ResponseError"
    }
}

export async function get(url: string, cache = false) {
    if (url.startsWith("/")) {
        url = API_BASE + url
    }

    const response = await fetch(url, {
        ...commonOpts,
        cache: cache ? "default" : "reload",
    })

    if (!response.ok) {
        throw new ResponseError(response, await response.json())
    }

    return await response.json()
}

export async function post(url: string, json: Json) {
    if (url.startsWith("/")) {
        url = API_BASE + url
    }

    const body: string = JSON.stringify(json)

    console.info("POST", url, JSON.parse(body))

    const response = await fetch(url, {
        ...commonOpts,
        method: "POST",
        body,
        headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": csrftoken,
        },
    })

    if (!response.ok) {
        throw new ResponseError(response, await response.json())
    }

    return await response.json()
}

export async function patch(url: string, json: Json) {
    if (url.startsWith("/")) {
        url = API_BASE + url
    }

    const body = JSON.stringify(json)

    console.info("PATCH", url, JSON.parse(body))

    const response = await fetch(url, {
        ...commonOpts,
        method: "PATCH",
        body,
        headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": csrftoken,
        },
    })

    if (!response.ok) {
        throw new ResponseError(response, await response.json())
    }

    const text = await response.text()
    if (!text) {
        return
    }
    return JSON.parse(text)
}

export interface AnonymousUser {
    is_you: boolean,
    is_anonymous: true,
}

export interface User {
    is_you: boolean,
    is_anonymous: false,

    id: number,
    username: string,
    name: string,
    avatar_url: string | null,
    github_api_url: string | null,
    github_html_url: string | null,
}

export function isAnonUser(user: User | AnonymousUser): user is AnonymousUser {
    return user.is_anonymous
}
