export interface MockQueryBuilder<T> {
    select: () => { data: T[]; error: null };
    insert: (data: Partial<T>) => { data: T; error: null };
    update: (data: Partial<T>) => { data: T; error: null };
    eq: (column: string, value: unknown) => { data: T[]; error: null };
    single: () => { data: T; error: null };
    delete: () => { data: T; error: null };
    neq: (column: string, value: unknown) => { data: T[]; error: null };
    gt: (column: string, value: unknown) => { data: T[]; error: null };
    gte: (column: string, value: unknown) => { data: T[]; error: null };
    lt: (column: string, value: unknown) => { data: T[]; error: null };
    lte: (column: string, value: unknown) => { data: T[]; error: null };
    in: (column: string, values: unknown[]) => { data: T[]; error: null };
    is: (column: string, value: unknown) => { data: T[]; error: null };
    csv: (column: string, value: string) => { data: T[]; error: null };
    fts: (column: string, query: string, options?: { config?: string; type?: string }) => { data: T[]; error: null };
    plfts: (column: string, query: string, options?: { config?: string; type?: string }) => { data: T[]; error: null };
    phfts: (column: string, query: string, options?: { config?: string; type?: string }) => { data: T[]; error: null };
    wfts: (column: string, query: string, options?: { config?: string; type?: string }) => { data: T[]; error: null };
    ilike: (column: string, pattern: string) => { data: T[]; error: null };
    like: (column: string, pattern: string) => { data: T[]; error: null };
    cs: (column: string, value: unknown) => { data: T[]; error: null };
    cd: (column: string, value: unknown) => { data: T[]; error: null };
    ov: (column: string, value: unknown) => { data: T[]; error: null };
    sl: (column: string, value: unknown) => { data: T[]; error: null };
    sr: (column: string, value: unknown) => { data: T[]; error: null };
    nxr: (column: string, value: unknown) => { data: T[]; error: null };
    nxl: (column: string, value: unknown) => { data: T[]; error: null };
    adj: (column: string, value: unknown) => { data: T[]; error: null };
    not: (column: string, operator: string, value: unknown) => { data: T[]; error: null };
    or: (filters: string) => { data: T[]; error: null };
    filter: (column: string, operator: string, value: unknown) => { data: T[]; error: null };
    textSearch: (column: string, query: string, options?: { config?: string; type?: string }) => { data: T[]; error: null };
    match: (query: Record<string, unknown>) => { data: T[]; error: null };
    order: (column: string, options?: { ascending?: boolean; nullsFirst?: boolean }) => { data: T[]; error: null };
    limit: (count: number, options?: { foreignTable?: string }) => { data: T[]; error: null };
    range: (from: number, to: number, options?: { foreignTable?: string }) => { data: T[]; error: null };
    abortSignal: (signal: AbortSignal) => { data: T[]; error: null };
    // Add other methods as needed
}

export interface MockStorageFrom {
    upload: jest.Mock;
    download: jest.Mock;
    remove: jest.Mock;
    copy: jest.Mock;
    move: jest.Mock;
    createSignedUrl: jest.Mock;
    getPublicUrl: jest.Mock;
}

export interface MockAuth {
    signUp: jest.Mock;
    signInWithPassword: jest.Mock;
    signOut: jest.Mock;
    getUser: jest.Mock;
    admin: {
        updateUserById: jest.Mock;
        deleteUser: jest.Mock;
        listUsers: jest.Mock;
        createUser: jest.Mock;
    };
}

export interface MockSupabaseClient {
    from: <T extends Record<string, unknown>>(table: string) => MockQueryBuilder<T>;
    rpc: jest.Mock;
    auth: MockAuth;
    storage: MockStorageFrom;
    supabaseUrl: string;
    supabaseKey: string;
    realtime: object;
    realtimeUrl: string;
    authUrl: string;
    functionsUrl: string;
    storageUrl: string;
    schema: string;
    headers: Record<string, string>;
    fetch: typeof fetch;
    db: object;
    functions: object;
}

export interface TestUser {
    id: string;
    email: string;
    password?: string;
    role: string;
    enterprise_id: string;
    firstName?: string;
    lastName?: string;
}