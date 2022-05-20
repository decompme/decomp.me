import LogoGBA from "./gba.svg"
import LogoGCWii from "./gc_wii.svg"
import LogoMacOS from "./macos9.svg"
import LogoN64 from "./n64.svg"
import LogoNDS from "./nds.svg"
import LogoPS1 from "./ps1.svg"
import LogoPS2 from "./ps2.svg"
import LogoSwitch from "./switch.svg"
import UnknownIcon from "./unknown.svg"

const ICONS = {
    "gba": LogoGBA,
    "gc_wii": LogoGCWii,
    "nds_arm9": LogoNDS,
    "n64": LogoN64,
    "ps1": LogoPS1,
    "ps2": LogoPS2,
    "switch": LogoSwitch,
    "macos9": LogoMacOS,
}

export type Props = {
    platform: string
    className?: string
    size?: string | number
}

export default function PlatformIcon({ platform, className, size }: Props) {
    const Icon = ICONS[platform] || UnknownIcon

    return <Icon width={size} height={size} className={className} />
}
