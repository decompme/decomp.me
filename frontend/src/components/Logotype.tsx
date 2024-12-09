import Frog from "./Nav/frog.svg"

export default function Logotype() {
    return <div className="inline-flex items-center space-x-2" aria-label="decomp.me logo">
        <Frog className="size-7" aria-label="Purple frog" />
        <span className="font-semibold text-xl leading-6 tracking-tight">decomp.me</span>
    </div>
}
