export interface Page<T> {
    next: string | null;
    previous: string | null;
    results: T[];
}

export interface AnonymousUser {
    is_anonymous: true;
    id: number;
    is_online: boolean;
    is_admin: boolean;
    username: string;

    frog_color: [number, number, number];
}

export interface User {
    is_anonymous: false;
    id: number;
    is_online: boolean;
    is_admin: boolean;
    username: string;

    github_id: number | null;
}

export interface TerseScratch {
    slug: string;
    owner: AnonymousUser | User | null; // null = unclaimed
    parent: string | null;
    name: string;
    creation_time: string;
    last_updated: string;
    compiler: string;
    preset: number;
    platform: string;
    language: string;
    score: number; // -1 = doesn't compile
    max_score: number;
    match_override: boolean;
    project: string;
    libraries: Library[];
}

export interface Scratch extends TerseScratch {
    description: string;
    compiler_flags: string;
    diff_flags: string[];
    source_code: string;
    context: string;
    diff_label: string;
}

export interface ClaimableScratch extends Scratch {
    claim_token: string;
}

export type Compilation = {
    compiler_output: string;
    diff_output: DiffOutput | null;
    left_object: string | null; // base64 encoded
    right_object: string | null; // base64 encoded
    success: boolean;
};

export type DiffOutput = {
    arch_str: string;
    current_score: number;
    max_score: number;
    header: DiffHeader;
    rows: DiffRow[];
};

export type DiffHeader = {
    base: DiffText[];
    current: DiffText[];
    previous?: DiffText[];
};

export type DiffRow = {
    key: string;
    base?: DiffCell;
    current?: DiffCell;
    previous?: DiffCell;
};

export type DiffCell = {
    text: DiffText[];
    line?: number;
    branch?: number;
    src?: string;
    src_comment?: string;
    src_line?: number;
    src_path?: string;
};

export type DiffText = {
    text: string;
    format?: string;
    group?: string;
    index?: number;
    key?: string;
};

export type Flag =
    | {
          type: "checkbox";
          id: string;
          flag: string;
      }
    | {
          type: "flagset";
          id: string;
          flags: string[];
      };

export type Library = {
    name: string;
    version: string;
};

export type LibraryVersions = {
    name: string;
    supported_versions: string[];
    platform: string;
};

export type Preset = {
    id: number;
    name: string;
    platform: string;
    compiler: string;
    assembler_flags: string;
    compiler_flags: string;
    diff_flags: string[];
    decompiler_flags: string;
    libraries: Library[];
    num_scratches: number;
    owner: User | null; // null = default
};

export type Compiler = {
    platform: string;
    flags: Flag[];
    diff_flags: Flag[];
};

export interface PlatformBase {
    id: string;
    name: string;
    description: string;
    arch: string;
    has_decompiler: boolean;
}

export interface PlatformMetadata extends PlatformBase {
    num_scratches: number;
}

export interface Platform extends PlatformBase {
    presets: Preset[];
}

export interface ScratchResult {
    type: "scratch";
    item: TerseScratch;
}

export interface PresetResult {
    type: "preset";
    item: Preset;
}

export interface UserResult {
    type: "user";
    item: User;
}

export type SearchResult = ScratchResult | PresetResult | UserResult;

export function isAnonUser(user: User | AnonymousUser): user is AnonymousUser {
    return user.is_anonymous;
}
