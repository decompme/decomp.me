"use client"

import { mutate } from "swr"

import AsyncButton from "../../../components/AsyncButton"
import { useThisUser, isAnonUser } from "../../../lib/api"
import { post } from "../../../lib/api/request"

export default function SignOutButton() {
    const user = useThisUser()
    const isAnon = user && isAnonUser(user)

    return <AsyncButton
        onClick={async () => {
            const user = await post("/user", {})
            await mutate("/user", user)
        }}
    >
        {isAnon ? "Reset anonymous appearance" : "Sign out"}
    </AsyncButton>
}
