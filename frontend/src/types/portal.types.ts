// src/types/portal.types.ts

export type PortalTokenType = 'sign' | 'view' | 'redline' | 'negotiate' | 'full';

export interface PortalSession {
  session_token: string;
  expires_at: string;
  token_type: PortalTokenType;
  party_name: string;
  party_email: string;
  party_role: string;
  contract_id: string | null;
  signature_request_id: string | null;
  redline_session_id: string | null;
}

export interface PortalValidationResponse {
  success: boolean;
  requires_pin?: boolean;
  requires_email_verification?: boolean;
  party_email?: string;
  message?: string;
  session_token?: string;
  expires_at?: string;
  token_type?: PortalTokenType;
  party_name?: string;
  contract_id?: string;
  signature_request_id?: string;
  redline_session_id?: string;
}

export interface PortalDocument {
  id: string;
  name?: string;
  title?: string;
  file_path?: string;
  file_type?: string;
  content?: string;
  version_number?: number;
  status?: string;
}

export interface SignatureRequest {
  id: string;
  title: string;
  description?: string;
  status: string;
  documents: {
    id: string;
    name: string;
    file_path: string;
    file_type: string;
    document_order: number;
  }[];
  signatories: {
    id: string;
    name: string;
    email: string;
    role: string;
    status: string;
    signing_order: number;
  }[];
  expires_at?: string;
  created_at: string;
}

export interface SignatureSubmission {
  signature_type: 'drawn' | 'typed' | 'uploaded';
  signature_data: string;
  consent_text: string;
  font_family?: string;
  canvas_width?: number;
  canvas_height?: number;
}

export interface RedlineChange {
  id: string;
  redline_type: 'insert' | 'delete' | 'replace' | 'comment';
  original_text?: string;
  new_text?: string;
  start_position: number;
  end_position?: number;
  comment?: string;
  status: 'pending' | 'accepted' | 'rejected';
  suggested_by_external?: string;
  created_at: string;
}

export interface RedlineSubmission {
  redline_type: 'insert' | 'delete' | 'replace' | 'comment';
  start_position: number;
  end_position?: number;
  original_text?: string;
  new_text?: string;
  comment?: string;
}

export interface NegotiationMessage {
  id: string;
  sender_type: 'internal' | 'external';
  sender_name: string;
  message_text: string;
  subject?: string;
  is_important: boolean;
  parent_message_id?: string;
  created_at: string;
  read_at?: string;
}

export interface MessageSubmission {
  message_text: string;
  subject?: string;
  parent_message_id?: string;
  is_important?: boolean;
}
