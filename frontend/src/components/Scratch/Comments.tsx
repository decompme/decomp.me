
import useSWR from "swr";

import { useState } from "react";

import { TerseScratch, get } from "@/lib/api";
import * as api from "@/lib/api"
import AsyncButton from "../AsyncButton"
import { Comment } from "@/lib/api";
import { styles } from "./Comments.module.scss"




export default function Comments({ scratch }: { scratch: TerseScratch }) {
    const { results, _isLoading, hasNext, loadNext } = api.usePaginated<api.Comment>(`/comment?scratch=${scratch.slug}&page_size=10`)
    const [text, setText] = useState("")
    const submit = async () => {
        try {
            await api.post(`/comment?scratch_id=${scratch.slug}`, {text: text})
        } catch (error) {
            console.error(error)
            throw error
        }
    }

    return (
        <div>
            <section id="comment-section">
                {results.map((comment: Comment) => {
                    return (
                        <div key={comment.slug}>
                            <h1>{comment.owner.username}:</h1>
                            <p>{comment.text}</p>
                            <br />
                        </div>
                    )
                })
                }
                { hasNext && <li className="">
                    <AsyncButton onClick={loadNext}>
                        Show more
                    </AsyncButton>
                </li>}
            </section>
            <section id="input-section">
                <div>
                    <input onChange={(e) => {setText(e.target.value) }} />
                    <AsyncButton onClick={submit}>Submit Comment</AsyncButton>
                </div>
            </section>
        </div>
    )
}
