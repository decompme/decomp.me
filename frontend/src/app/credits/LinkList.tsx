import GhostButton from "../../components/GhostButton"

export type Props = {
    links: { [key: string]: string }
}

export default function LinkList({ links }: Props) {
    return <ul className="flex flex-wrap">
        {Object.entries(links).map(([name, url]) => {
            return <li key={name} className="p-2">
                <GhostButton href={url}>
                    {name}
                </GhostButton>
            </li>
        })}
    </ul>
}
