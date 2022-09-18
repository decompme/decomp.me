import { useEffect, useState } from "react"

import { CheckCircleIcon, MarkGithubIcon, XCircleIcon } from "@primer/octicons-react"
import classNames from "classnames"
import TimeAgo from "react-timeago"

import * as api from "../lib/api"

import styles from "./GitHubRepoPicker.module.scss"
import Loading from "./loading.svg"
import StringInput from "./StringInput"

interface GitHubApiRepo {
    name: string
    pushed_at: string
    default_branch: string
    owner: {
        login: string
    }
}

enum ValidationState {
    LOADING = "Loading",
    VALID = "Repository exists",
    INVALID = "Repository does not exist or is private",
    IS_EMPTY = "",
    RATE_LIMIT = "Rate limit exceeded",
}

export function isValidIdentifierKey(key: string): boolean {
    return key.match(/^[a-zA-Z0-9-_.]$/) !== null
}

export interface Props {
    owner?: string
    repo?: string
    onChangeValid: (obj: { owner: string, repo: string, defaultBranch?: string }) => void
    className?: string
}

export default function GitHubRepoPicker(props: Props) {
    const [owner, setOwner] = useState(props.owner ?? "")
    const [repo, setRepo] = useState(props.repo ?? "")

    // Default owner to the logged-in user
    const user = api.useThisUser()
    useEffect(() => {
        if (owner === "" && user && !api.isAnonUser(user)) {
            setOwner(user.username)
        }
    }, [user, owner])

    // Validate the repo exists
    const [validationState, setValidationState] = useState(ValidationState.IS_EMPTY)
    const [hitRateLimit, setHitRateLimit] = useState(false)
    const onChangeValid = props.onChangeValid
    useEffect(() => {
        if (owner === "" || repo === "") {
            setValidationState(ValidationState.IS_EMPTY)
            return
        }

        setValidationState(ValidationState.LOADING)
        fetch(`https://api.github.com/repos/${owner}/${repo}`).then(response => {
            if (response.status == 200) {
                setValidationState(ValidationState.VALID)

                response.json().then((ghRepo: GitHubApiRepo) => {
                    onChangeValid({
                        owner: ghRepo.owner.login,
                        repo: ghRepo.name,
                        defaultBranch: ghRepo.default_branch,
                    })
                })
            } else if (response.status == 404) {
                setValidationState(ValidationState.INVALID)
            } else if (response.status == 403) {
                setValidationState(ValidationState.RATE_LIMIT)
                onChangeValid({ owner, repo })
                setHitRateLimit(true)
            }
        })
    }, [owner, repo, onChangeValid])

    // Get owner's repos to suggest
    const [suggestions, setSuggestions] = useState<GitHubApiRepo[]>([])
    const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(true)
    useEffect(() => {
        setSuggestions([])

        if (owner === "") {
            setIsLoadingSuggestions(false)
            return
        }

        setIsLoadingSuggestions(true)
        fetch(`https://api.github.com/users/${owner}/repos`).then(response => {
            if (response.status === 403) {
                setHitRateLimit(true)
            }

            if (response.status !== 200) {
                setSuggestions([])
                setIsLoadingSuggestions(false)
                return
            }

            response.json().then((repos: GitHubApiRepo[]) => {
                // Sort by most recently updated
                repos.sort((a, b) => {
                    return new Date(a.pushed_at) > new Date(b.pushed_at) ? -1 : 1
                })

                // Limit to 5
                setSuggestions(repos.slice(0, 5))
                setIsLoadingSuggestions(false)
            })
        })
    }, [owner])

    return <div className={classNames(styles.container, props.className)}>
        <div className={styles.inputsContainer}>
            <MarkGithubIcon />
            <StringInput
                className={styles.input}
                label="Owner"
                value={owner}
                onChange={setOwner}
                isValidKey={isValidIdentifierKey}
            />
            /
            <StringInput className={styles.input} label="Repository" value={repo} onChange={setRepo} isValidKey={isValidIdentifierKey} />
            <div className={styles.end} title={validationState}>
                {validationState == ValidationState.LOADING && <Loading />}
                {validationState == ValidationState.VALID && <CheckCircleIcon className={styles.green} />}
                {validationState == ValidationState.INVALID && <XCircleIcon className={styles.red} />}
            </div>
        </div>
        {!hitRateLimit && <ul aria-label="Suggestions" className={styles.suggestions}>
            {suggestions.length == 0 && <div className={styles.suggestionsLoading}>
                {isLoadingSuggestions ? <Loading /> : "User has no repositories"}
            </div>}
            {suggestions.map(suggestion => {
                return <li key={`${suggestion.owner.login}/${suggestion.name}`}>
                    <button
                        onClick={() => {
                            setOwner(suggestion.owner.login)
                            setRepo(suggestion.name)
                        }}
                    >
                        {suggestion.name}
                        <TimeAgo date={suggestion.pushed_at} />
                    </button>
                </li>
            })}
        </ul>}
    </div>
}
