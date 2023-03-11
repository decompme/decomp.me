export function joinTitles(...breadcrumbs: string[]) {
    return [
        ...breadcrumbs,
        "decomp.me",
    ].filter(Boolean).join(" - ")
}
