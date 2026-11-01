export const MIN_SEARCH_QUERY_LENGTH = 3;
export const MAX_SEARCH_QUERY_LENGTH = 64;

export function isLongEnoughToSearch(query: string): boolean {
    return query.trim().length >= MIN_SEARCH_QUERY_LENGTH;
}
