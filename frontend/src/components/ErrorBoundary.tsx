import React from "react"

interface State {
    error?: unknown
}

export interface Props {
    children?: React.ReactNode
    forceError?: boolean
    fallback?: (state: State) => React.ReactNode
    onError?: (error: unknown, errorInfo: any) => void
}

export default class ErrorBoundary extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props)
        this.state = { error: undefined }
    }

    static getDerivedStateFromError(error: unknown) {
        // Update state so the next render will show the fallback UI.
        return { error }
    }

    componentDidCatch(error: unknown, errorInfo: unknown) {
        console.error("Error boundary caught an error:", error, errorInfo)
        this.props.onError?.(error, errorInfo)
    }

    render() {
        if (this.state.error || this.props.forceError) {
            const fallback = this.props.fallback ? this.props.fallback(this.state) : null
            return fallback
        }

        return this.props.children || null
    }
}
