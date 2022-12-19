import { SVGProps } from "react"

import classNames from "classnames"

import * as api from "../../lib/api"
import Frog from "../Nav/frog.svg"

import styles from "./AnonymousFrog.module.scss"

export type Props = SVGProps<SVGElement> & {
    user: api.AnonymousUser
    className?: string
}

export default function AnonymousFrogAvatar({ user, className, ...props }: Props) {
    const accentStyle = {
        "--accent-hue": user.frog_color[0],
        "--accent-saturation": user.frog_color[1],
        "--accent-lightness": user.frog_color[2],
    }

    return <Frog style={accentStyle} className={classNames(styles.anonymousFrog, className)} {...props}/>
}
