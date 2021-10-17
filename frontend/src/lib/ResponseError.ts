export type ErrorJSON = {
    error?: string
    detail?: string
    errors?: string[]
}

export default class ResponseError extends Error {
    status: number
    responseJSON: ErrorJSON

    constructor(response: Response, responseJSON: ErrorJSON) {
        super(`Server responded with HTTP status code ${response.status}`)

        this.status = response.status
        this.responseJSON = responseJSON

        if (responseJSON.error) {
            this.message = responseJSON.error
        } else if (responseJSON.detail) {
            this.message = responseJSON.detail
        } else if (responseJSON.errors) {
            this.message = responseJSON.errors.join(",")
        }

        this.name = "ResponseError"
    }
}
