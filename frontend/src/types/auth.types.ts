export interface AuthResponse {
  access_token: string;
  refresh_token?: string;
  user_id: number;
  enterprise_id: number;
  is_superuser: boolean;
  token_type: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
  user_agent?: string;
  mfa_code?: string | null;
}

export interface AuthError {
  error_type:
    | "INVALID_CREDENTIALS"
    | "ACCOUNT_LOCKED"
    | "MFA_REQUIRED"
    | "EMAIL_NOT_VERIFIED"
    | "ACCOUNT_INACTIVE";
  message: string;
}
