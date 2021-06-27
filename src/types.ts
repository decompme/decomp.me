
export interface Project {
    id: number,
    name: string
}


export interface Func {
    id: number,
    projectId: number,
    name: string,
    cCode?: string,
    asmCode?: string,
    score?: number
}

export interface User {
    id: number,
    name: string,
    points: number
}