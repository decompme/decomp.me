import classNames from "classnames"

import PlatformIcon, { PLATFORMS } from "./PlatformIcon"
import styles from "./ScrollingPlatformIcons.module.scss"

function SingleSet() {
    return <div className={classNames("flex gap-2", styles.scrolling)}>
        {PLATFORMS.map(platform => <PlatformIcon key={platform} platform={platform} className="ml-16 h-24 w-24 md:h-32 md:w-32" />)}
    </div>
}

export default function ScrollingPlatformIcons() {
    return <div className="pointer-events-none flex" aria-hidden>
        <SingleSet />
        <SingleSet />
    </div>
}
