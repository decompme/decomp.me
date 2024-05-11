import { useEffect, useRef, useState } from "react";

import Loading from "@/components/loading.svg"
import { TerseScratch, get } from "@/lib/api";
import * as api from "@/lib/api"
import AsyncButton from "../AsyncButton"
import { Comment } from "@/lib/api";
import UserLink from "../user/UserLink";
import { formatDistanceToNowStrict } from "date-fns"

import styles from "./Comments.module.scss"



export default function Comments({ scratch }: { scratch: TerseScratch }) {
    const { results, isLoading, hasNext, loadNext } = api.usePaginated<api.Comment>(`/comment?scratch=${scratch.slug}&page_size=10`)
    const [text, setText] = useState("")
    const bottomRef = useRef(null)
    const inputRef = useRef(null)

    const submit = async () => {
        try {
            const response = await api.post(`/comment?scratch_id=${scratch.slug}`, { text: text })
            if (response) {
                inputRef.current?.reset()
            }
            console.log(response)

        } catch (error) {
            console.error(error)
            throw error
        }
    }


    const scrollToBottom = () => {
        console.log("Scrolling")
        bottomRef.current.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "start" })
    }

    useEffect(() => {
        if (bottomRef.current) {
            scrollToBottom()
        }
    }, [bottomRef])

    return (
        <div >
            {isLoading && <div className="flex size-full items-center justify-center">
                <Loading className="size-8 animate-pulse" />
            </div>}
            <section id="comment-section" className="flex flex-col-reverse">
                {results.map((comment: Comment) => {
                    return (
                        <div key={comment.slug} >
                            <div className="flex">
                                <h1><UserLink user={comment.owner} /></h1>
                                <span className={styles.metadata}>{formatDistanceToNowStrict(comment.creation_time)} ago</span>
                            </div>
                            <p>{comment.text}</p>
                            <br />
                        </div>
                    )
                })
                }
                {hasNext && <li className="">
                    <AsyncButton onClick={loadNext}>
                        Show more
                    </AsyncButton>
                </li>}
            </section>
            <section ref={bottomRef} id="input-section">
                <div className="flex">
                    <form ref={inputRef} id="commentForm">
                        <input className={styles.textInput} onChange={(e) => { setText(e.target.value) }} />
                    </form>
                    <AsyncButton onClick={submit}>Submit Comment</AsyncButton>
                </div>
            </section>
        </div>
    )
}
