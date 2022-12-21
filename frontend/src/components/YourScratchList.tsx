"use client"

import { useThisUser, isAnonUser } from "@/lib/api"

import ScratchList, { Props as ScratchListProps } from "./ScratchList"

export type Props = Omit<ScratchListProps, "url">

export default function YourScratchList(props: Props) {
    const user = useThisUser()
    const url = (!user || isAnonUser(user))
        ? "/user/scratches?page_size=16" // Using this url all the time results in stale data if you log out
        : `/users/${user.username}/scratches?page_size=16`

    return <ScratchList
        url={url}
        emptyButtonLabel="Create your first scratch"
        {...props}
    />
}
