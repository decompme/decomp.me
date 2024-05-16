"use client"

import { ChangeEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR, { mutate } from "swr";

import * as api from "@/lib/api"
import { Comment } from "@/lib/api";
import { commentUrl } from "@/lib/api/urls";

import { formatDistanceToNowStrict } from "date-fns"

import { ArrowUpIcon, KebabHorizontalIcon, CheckIcon } from "@primer/octicons-react"
import Loading from "@/components/loading.svg"

import AsyncButton from "../AsyncButton"
import UserLink from "../user/UserLink";
import Button from "../Button";

import styles from "./Comments.module.scss"
import Dropdown from "../Dropdown";

const maxTextLength = 5000

async function deleteComment(comment: Comment) {
    try {
        await api.delete_(commentUrl(comment), {})
        alert("Comment deleted")
    } catch (e) {
        alert(`Error Deleting Comment: ${e}`)
    }
}

function EditComment({ comment, stopEditing, submit }: { comment: any, stopEditing: () => void, submit: (text: string) => Promise<unknown> }) {
    const [text, setText] = useState(comment.text)
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const handleInput = (e: ChangeEvent<HTMLTextAreaElement>) => {
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
            textareaRef.current.style.height = `${e.target.scrollHeight + 2}px`;
        }
        setText(e.target.value)
    };

    return (
        <div>
            <div className="flex items-center gap-0.5">
                <h1><UserLink user={comment.owner} /></h1>
            </div>
            <section className={styles.inputSection}>
                <div className="relative w-full">
                    <form>
                        <div className="w-full">
                            <textarea
                                ref={textareaRef}
                                autoComplete="off"
                                rows={1}
                                className={styles.textInput}
                                onChange={handleInput}
                                maxLength={maxTextLength}
                                defaultValue={comment.text}
                            />
                        </div>
                    </form>
                    <AsyncButton
                        className={styles.submit}
                        onClick={async () => { await submit(text)} }
                    ><CheckIcon /></AsyncButton>
                </div>
                <div className="flex flex-row-reverse gap-1 items-center">
                    <div className={styles.counter}>{text.length} / {maxTextLength}</div>
                    <button className="text-xs" onClick={stopEditing}>Cancel</button>
                </div>
            </section>
            <br />
        </div>
    )
}

function CommentItem({ comment, canModify }: { comment: any, canModify?: boolean }) {
    const router = useRouter()
    const userIsYou = api.useUserIsYou()
    const options = {
        "Edit Comment ✏️": () => {
            comment.isEditing = true
            router.refresh()
        },
        "Delete Comment🚫": (event: KeyboardEvent) => {
            if (event.shiftKey || confirm("Are you sure you want to delete this scratch? This action cannot be undone.")) {
                deleteComment(comment)
                comment.isDeleted = true;
                router.refresh()
            }
        },
    }

    const submit = async (text: string) => {
        if (!userIsYou(comment.owner)) {
            throw new Error("Cannot save scratch which you do not own")
        }
        const updatedComment = await api.patch(commentUrl(comment), {
            slug: comment.slug,
            owner: comment.owner,
            text: text,
            created_on: comment.created_on,
        })

        await mutate(commentUrl(comment), updatedComment, { revalidate: false })
        comment.text = text
        stopEditing()
    }

    const stopEditing = () => {
        comment.isEditing = false
        router.refresh()
    }

    if (comment.isDeleted) {
        return
    }

    if (comment.isEditing) {
        return <EditComment comment={comment} stopEditing={stopEditing} submit={submit} />
    }

    return (
        <div>
            <div className="flex items-center gap-0.5">
                <h1><UserLink user={comment.owner} /></h1>
                <span className={styles.metadata}>{formatDistanceToNowStrict(comment.creation_time)} ago</span>
                {(canModify || (comment.owner && userIsYou(comment.owner))) &&
                    <Dropdown options={options}><KebabHorizontalIcon className="pl-1" /></Dropdown>}
            </div>
            <p className={styles.text}>{comment.text}</p>
            <br />
        </div>
    )
}

function CommentList({ results, canModify }: { results: Comment[], canModify?: boolean }) {

    return (
        <div className="flex flex-col-reverse">
            {results.map((comment: Comment) => {
                return <CommentItem comment={comment} key={comment.slug} canModify={canModify} />
            })}
        </div>
    )
}

export default function Comments({ scratch, scrollRef }: { scratch: api.TerseScratch, scrollRef: any }) {

    const userIsYou = api.useUserIsYou()
    const canModify = (scratch.owner && userIsYou(scratch.owner)) || api.useThisUserIsAdmin()


    const router = useRouter()

    const [needsUpdating, setNeedsUpdating] = useState(false)
    const [text, setText] = useState("")

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const bottomRef = useRef<HTMLDivElement>(null)

    const { results, isLoading, hasNext, loadNext } = api.usePaginated<api.Comment>(`/comment?scratch=${scratch.slug}&page_size=20`)
    // Check for new comments
    const { error } = useSWR(`/comment?scratch=${scratch.slug}&page_size=1`, api.get, {
        refreshInterval: 30 * 1000, // 30 Seconds
        onSuccess: (newData) => {
            if (results[0]?.slug && newData.results[0]?.slug) {
                setNeedsUpdating(results[0].slug !== newData.results[0]?.slug)
            }
        }
    })

    const refreshResults = async () => {
        const response = await api.post(`/comment?scratch_id=${scratch.slug}`, { text: text })
        if (response) {
            await api.get(`/comment?slug=${response.slug}`).then((comment) => {
                results.unshift(comment.results[0])
            })
            textareaRef.current.style.height = "33px";
            textareaRef.current.value = "";
        }
        router.refresh()
    }

    const handleInput = (e: ChangeEvent<HTMLTextAreaElement>) => {
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
            textareaRef.current.style.height = `${e.target.scrollHeight + 2}px`;
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
        setText(e.target.value)
    };

    function NeedsRefresh({ error }: { error: string }) {
        const message = error ? error : "Refresh"
        return (
            <div className="flex flex-row-reverse">
                <Button
                    className={styles.refresh}
                    danger={true}
                    onClick={() => {
                        router.push(`https://decomp.me/scratch/${scratch.slug}`)
                    }}
                >{message}</Button>
            </div>
        )
    }

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
        <div className={styles.holder}>
            {(needsUpdating || error) && <NeedsRefresh error={error} />}
            <section id="comment-section" className={styles.commentsBody}>
                <div>
                    <CommentList results={results} canModify={canModify} />
                </div>
                {hasNext &&
                    <div className="flex justify-center">
                        <AsyncButton onClick={loadNext}>
                            Show more
                        </AsyncButton>
                    </div>
                }
            </section>
            <section ref={bottomRef} className={styles.inputSection}>
                <div className="relative w-full">
                    <form>
                        <div className="w-full">
                            <textarea
                                ref={textareaRef}
                                autoComplete="off"
                                rows={1}
                                className={styles.textInput}
                                onChange={handleInput}
                                maxLength={maxTextLength}
                                placeholder="Message..."
                            />
                        </div>
                    </form>
                    <AsyncButton
                        className={styles.submit}
                        onClick={async () => { await refreshResults() }}
                    ><ArrowUpIcon /></AsyncButton>
                </div>
                <div className={styles.counter}>{text.length} / {maxTextLength}</div>
            </section>
        </div>
    )
}
