import LogoGCWii from "./gc_wii.svg"
import LogoN64 from "./n64.svg"
import LogoPS1 from "./ps1.svg"
import LogoPS2 from "./ps2.svg"
import UnknownIcon from "./unknown.svg"

const ICONS = {
    "gc_wii": LogoGCWii,
    "n64": LogoN64,
    "ps1": LogoPS1,
    "ps2": LogoPS2,
}

export type Props = {
    platform: string
    className?: string
}

export default function PlatformIcon({ platform, className }: Props) {
    const Icon = ICONS[platform] || UnknownIcon

    return <Icon className={className} />
}
