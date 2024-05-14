import { useEffect, useRef, useState } from "react";

import Loading from "@/components/loading.svg"
import { TerseScratch, get } from "@/lib/api";
import * as api from "@/lib/api"
import AsyncButton from "../AsyncButton"
import { Comment } from "@/lib/api";
import UserLink from "../user/UserLink";
import { formatDistanceToNowStrict } from "date-fns"
import styles from "./Comments.module.scss"
import { createRoot } from 'react-dom/client';

interface ItemProps {
    comment: Comment
}

function CommentItem({ comment }: ItemProps) {
    return (
        <div>
            <div className="flex">
                <h1><UserLink user={comment.owner} /></h1>
                <span className={styles.metadata}>{formatDistanceToNowStrict(comment.creation_time)} ago</span>
            </div>
            <p>{comment.text}</p>
            <br />
        </div>
    )
}

interface ListProps {
    results: Comment[]

}

function CommentList({ results }: ListProps) {
    return (
        <div className="flex flex-col-reverse">
            {results.map((comment: Comment) => {
                return <CommentItem comment={comment} key={comment.slug} />
            })}
        </div>
    )
}

export default function Comments({ scratch }: { scratch: TerseScratch }) {
    const { results, isLoading, hasNext, loadNext } = api.usePaginated<api.Comment>(`/comment?scratch=${scratch.slug}&page_size=10`)
    const [text, setText] = useState("")
    const bottomRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLFormElement>(null)
    const commentListRef = useRef<HTMLDivElement>(null)
    const root = useRef(null)
    const submit = async () => {
        try {
            const response = await api.post(`/comment?scratch_id=${scratch.slug}`, { text: text })
            if (response) {
                await api.get(`/comment?slug=${response.slug}`).then((comment) => {
                    results.unshift(comment.results[0])
                    root.current?.render(<CommentList results={results} />)
                })
                inputRef.current?.reset()
            }
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
        // Create the root if it doesn't exist
        if (!root.current && commentListRef.current) {
            root.current = createRoot(commentListRef.current);
        }
        return () => {
            // Don't unmount the root here
            // We'll keep the root throughout the component's lifecycle
        };
    }, []);

    useEffect(() => {
        if (bottomRef.current) {
            scrollToBottom()
        }
    }, [bottomRef])

    if (isLoading) {
        return (<>
            {isLoading && <div className="flex size-full items-center justify-center">
                <Loading className="size-8 animate-pulse" />
            </div>
            }
        </>
        )
    }

    return (
        <div >

            <section id="comment-section" className="flex flex-col-reverse">
                <div ref={commentListRef}>
                    <CommentList results={results} />
                </div>
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
