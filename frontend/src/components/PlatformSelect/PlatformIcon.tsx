import LogoGBA from "./gba.svg"
import LogoGCWii from "./gc_wii.svg"
import LogoIRIX from "./irix.svg"
import LogoMacOS from "./macos9.svg"
import LogoMacOSX from "./macosx.svg"
import LogoN3DS from "./n3ds.svg"
import LogoN64 from "./n64.svg"
import LogoNDS from "./nds.svg"
import LogoPS1 from "./ps1.svg"
import LogoPS2 from "./ps2.svg"
import LogoSwitch from "./switch.svg"
import UnknownIcon from "./unknown.svg"

/** In release-date order */
const ICONS = {
    "irix": LogoIRIX,
    "macos9": LogoMacOS,
    "macosx": LogoMacOSX,
    "n64": LogoN64,
    "gba": LogoGBA,
    "gc_wii": LogoGCWii,
    "nds_arm9": LogoNDS,
    "ps1": LogoPS1,
    "ps2": LogoPS2,
    "n3ds": LogoN3DS,
    "switch": LogoSwitch,
}

export const PLATFORMS = Object.keys(ICONS)

export type Props = {
    platform: string
    className?: string
    size?: string | number
}

export default function PlatformIcon({ platform, className, size }: Props) {
    const Icon = ICONS[platform] || UnknownIcon

    return <Icon width={size} height={size} className={className} />
}
