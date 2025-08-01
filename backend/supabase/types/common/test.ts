// Test utility type definitions

export interface MockSupabaseClient {
  from: (table: string) => MockQueryBuilder;
  rpc: (functionName: string, params?: Record<string, unknown>) => MockResponse;
  auth: MockAuthClient;
  storage: MockStorageClient;
}

export interface MockQueryBuilder {
  select: (columns?: string) => MockQueryBuilder;
  insert: (data: unknown) => MockResponse;
  update: (data: unknown) => MockQueryBuilder;
  delete: () => MockQueryBuilder;
  eq: (column: string, value: unknown) => MockQueryBuilder;
  neq: (column: string, value: unknown) => MockQueryBuilder;
  gt: (column: string, value: unknown) => MockQueryBuilder;
  gte: (column: string, value: unknown) => MockQueryBuilder;
  lt: (column: string, value: unknown) => MockQueryBuilder;
  lte: (column: string, value: unknown) => MockQueryBuilder;
  like: (column: string, pattern: string) => MockQueryBuilder;
  ilike: (column: string, pattern: string) => MockQueryBuilder;
  in: (column: string, values: unknown[]) => MockQueryBuilder;
  contains: (column: string, value: unknown) => MockQueryBuilder;
  containedBy: (column: string, value: unknown) => MockQueryBuilder;
  order: (column: string, options?: { ascending?: boolean }) => MockQueryBuilder;
  limit: (count: number) => MockQueryBuilder;
  range: (from: number, to: number) => MockQueryBuilder;
  single: () => MockResponse;
  maybeSingle: () => MockResponse;
  then?: (resolve: (value: unknown) => void, reject: (error: unknown) => void) => void;
  data?: unknown;
  error?: unknown;
}

export interface MockResponse {
  data: unknown;
  error: unknown;
  count?: number;
  status?: number;
  statusText?: string;
}

export interface MockAuthClient {
  signUp: (credentials: AuthCredentials) => Promise<AuthResponse>;
  signInWithPassword: (credentials: AuthCredentials) => Promise<AuthResponse>;
  signOut: () => Promise<{ error: unknown }>;
  getUser: () => Promise<UserResponse>;
  getSession: () => Promise<SessionResponse>;
  refreshSession: () => Promise<SessionResponse>;
  updateUser: (data: UpdateUserData) => Promise<UserResponse>;
  admin: MockAuthAdminClient;
}

export interface MockAuthAdminClient {
  createUser: (data: CreateUserData) => Promise<UserResponse>;
  updateUserById: (id: string, data: UpdateUserData) => Promise<UserResponse>;
  deleteUser: (id: string) => Promise<{ data: null; error: unknown }>;
  listUsers: (params?: ListUsersParams) => Promise<{ data: User[]; error: unknown }>;
}

export interface MockStorageClient {
  from: (bucket: string) => MockStorageBucket;
}

export interface MockStorageBucket {
  upload: (path: string, file: File | Blob, options?: UploadOptions) => Promise<StorageResponse>;
  download: (path: string) => Promise<{ data: Blob | null; error: unknown }>;
  remove: (paths: string[]) => Promise<{ data: FileObject[]; error: unknown }>;
  list: (path?: string, options?: ListOptions) => Promise<{ data: FileObject[]; error: unknown }>;
  copy: (fromPath: string, toPath: string) => Promise<StorageResponse>;
  move: (fromPath: string, toPath: string) => Promise<StorageResponse>;
  createSignedUrl: (path: string, expiresIn: number) => Promise<{ data: { signedUrl: string } | null; error: unknown }>;
  getPublicUrl: (path: string) => { data: { publicUrl: string } };
}

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  data: {
    user: User | null;
    session: Session | null;
  };
  error: unknown;
}

export interface UserResponse {
  data: {
    user: User | null;
  };
  error: unknown;
}

export interface SessionResponse {
  data: {
    session: Session | null;
  };
  error: unknown;
}

export interface User {
  id: string;
  email?: string;
  phone?: string;
  created_at: string;
  updated_at?: string;
  app_metadata: Record<string, unknown>;
  user_metadata: Record<string, unknown>;
  aud: string;
  role?: string;
}

export interface Session {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at?: number;
  token_type: string;
  user: User;
}

export interface UpdateUserData {
  email?: string;
  password?: string;
  data?: Record<string, unknown>;
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
}

export interface CreateUserData extends UpdateUserData {
  email: string;
  email_confirm?: boolean;
  phone?: string;
  phone_confirm?: boolean;
}

export interface ListUsersParams {
  page?: number;
  perPage?: number;
}

export interface UploadOptions {
  cacheControl?: string;
  contentType?: string;
  upsert?: boolean;
}

export interface StorageResponse {
  data: {
    path: string;
    id?: string;
    fullPath?: string;
  } | null;
  error: unknown;
}

export interface FileObject {
  name: string;
  id?: string;
  updated_at?: string;
  created_at?: string;
  size?: number;
  metadata?: Record<string, unknown>;
}

export interface ListOptions {
  limit?: number;
  offset?: number;
  sortBy?: {
    column: string;
    order: 'asc' | 'desc';
  };
}

// Test data factory types
export interface TestDataFactory {
  createContract: (overrides?: Partial<TestContract>) => TestContract;
  createVendor: (overrides?: Partial<TestVendor>) => TestVendor;
  createUser: (overrides?: Partial<TestUser>) => TestUser;
  createNotification: (overrides?: Partial<TestNotification>) => TestNotification;
}

export interface TestContract {
  id: string;
  title: string;
  value: number;
  content: string;
  vendor_id?: string;
  status: string;
  start_date: string;
  end_date: string;
}

export interface TestVendor {
  id: string;
  name: string;
  category: string;
  performance_score: number;
  status: string;
}

export interface TestUser {
  id: string;
  email: string;
  role: string;
  enterprise_id: string;
}

export interface TestNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  user_id: string;
}