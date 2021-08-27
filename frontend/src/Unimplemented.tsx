import { h } from "preact"
import { MarkGithubIcon, ChevronRightIcon } from "@primer/octicons-react"

export default function Unimplemented({ issue }: { issue: string }) {
    return <div style={{ color: "#ffffff88" }}>
        <p style={{ paddingTop: '0.5em', paddingBottom: '0.25em' }}>
            There's meant to be more here, but it's not implemented yet.
        </p>
        <span style={{ padding: '0.5em', paddingLeft: '0' }}>
            Think you could help?
        </span>

        {issue ? <a class="button" href={`https://github.com/ethteck/decomp.me/issues/${issue}`}>
            <MarkGithubIcon /> See the GitHub issue <ChevronRightIcon />
        </a> : <a class="button" href="https://github.com/ethteck/decomp.me">
            <MarkGithubIcon /> Contribute to decomp.me on GitHub    
        </a>}
    </div>
}
