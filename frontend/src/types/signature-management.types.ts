// ============================================================================
// SIGNATURE MANAGEMENT TYPES
// Types for signatures, certificates, and collaborative sessions
// ============================================================================

// ============================================================================
// SIGNATURE REQUEST TYPES
// ============================================================================

export type SignatureRequestStatus =
  | 'draft'
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'expired'
  | 'declined'
  | 'cancelled';

export type SigningOrder = 'sequential' | 'parallel';

export interface SignatureRequestListItem {
  id: string;
  title: string;
  contract_id: string;
  contract_title: string;
  status: SignatureRequestStatus;
  signatories_count: number;
  signed_count: number;
  created_at: string;
  expires_at: string | null;
  created_by: {
    id: string;
    name: string;
  };
}

export interface SignatureRequest {
  id: string;
  enterprise_id: string;
  contract_id: string;
  title: string;
  message: string | null;
  status: SignatureRequestStatus;
  signing_order: SigningOrder;
  expires_at: string | null;
  completed_at: string | null;
  document_hash: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type SignatoryStatus =
  | 'pending'
  | 'sent'
  | 'viewed'
  | 'signed'
  | 'declined';

export interface Signatory {
  id: string;
  signature_request_id: string;
  user_id: string | null;
  email: string;
  name: string;
  company: string | null;
  role: string;
  order_index: number;
  status: SignatoryStatus;
  sent_at: string | null;
  viewed_at: string | null;
  signed_at: string | null;
  declined_at: string | null;
  decline_reason: string | null;
  signature_data: {
    type: 'draw' | 'type' | 'upload';
    data: string;
    ip_address?: string;
    user_agent?: string;
  } | null;
  portal_token_id: string | null;
}

export interface SignatureEvent {
  id: string;
  signature_request_id: string;
  signatory_id: string | null;
  event_type: string;
  event_data: Record<string, unknown>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface SignatureRequestDetail extends SignatureRequest {
  contract: {
    id: string;
    title: string;
    contract_number: string;
  };
  signatories: Signatory[];
  events: SignatureEvent[];
}

// ============================================================================
// CERTIFICATE TYPES
// ============================================================================

export type CertificateStatus = 'active' | 'expired' | 'revoked';

export type CertificateType = 'ca' | 'user';

export interface SubjectDN {
  CN: string;
  O?: string;
  OU?: string;
  C?: string;
  ST?: string;
  L?: string;
}

export interface CertificateListItem {
  id: string;
  type: CertificateType;
  subject_cn: string;
  email?: string;
  status: CertificateStatus;
  valid_until: string;
  valid_from: string;
  issued_by?: string;
  fingerprint?: string;
}

export interface CertificateAuthority {
  id: string;
  enterprise_id: string;
  name: string;
  subject_dn: SubjectDN;
  public_key_pem: string;
  key_algorithm: string;
  serial_number: string;
  valid_from: string;
  valid_until: string;
  is_root: boolean;
  parent_ca_id: string | null;
  crl_url: string | null;
  status: CertificateStatus;
  created_at: string;
}

export interface UserCertificate {
  id: string;
  enterprise_id: string;
  ca_id: string;
  subject_dn: SubjectDN;
  email: string;
  user_id: string | null;
  serial_number: string;
  public_key_pem: string;
  certificate_pem: string;
  fingerprint_sha256: string;
  valid_from: string;
  valid_until: string;
  key_usage: string[];
  extended_key_usage: string[];
  status: CertificateStatus;
  revoked_at: string | null;
  revocation_reason: string | null;
  created_at: string;
}

export interface CADetail extends CertificateAuthority {
  issued_certificates_count: number;
  active_certificates_count: number;
  revoked_certificates_count: number;
  issued_certificates: UserCertificate[];
}

export interface UserCertificateDetail extends UserCertificate {
  ca: {
    id: string;
    name: string;
    subject_cn: string;
  };
  signature_count: number;
  recent_signatures: {
    id: string;
    signature_request_id: string;
    signed_at: string;
    contract_title: string;
  }[];
}

// ============================================================================
// COLLABORATIVE SESSION TYPES
// ============================================================================

export type SessionStatus = 'active' | 'ended';

export interface CollaborativeSessionListItem {
  id: string;
  document_title: string;
  contract_id: string;
  contract_title: string;
  status: SessionStatus;
  participant_count: number;
  created_at: string;
  updated_at: string;
  created_by: {
    id: string;
    name: string;
  };
}

export interface CollaborativeSession {
  id: string;
  document_version_id: string;
  enterprise_id: string;
  redline_session_id: string | null;
  status: SessionStatus;
  active_users: string[];
  external_participants: string[];
  created_at: string;
  updated_at: string;
}

export interface SessionParticipant {
  id: string;
  user_id: string | null;
  email: string;
  name: string;
  color: string;
  is_external: boolean;
  joined_at: string;
  last_active: string;
  is_online: boolean;
}

export interface SessionChange {
  id: string;
  session_id: string;
  user_id: string | null;
  user_name: string;
  user_color: string;
  change_type: 'insert' | 'delete' | 'format';
  content: string;
  position: {
    from: number;
    to: number;
  };
  created_at: string;
}

export interface CollaborativeSessionDetail extends CollaborativeSession {
  document: {
    id: string;
    version_number: number;
    file_name: string;
  };
  contract: {
    id: string;
    title: string;
    contract_number: string;
  };
  participants: SessionParticipant[];
  recent_changes: SessionChange[];
}

// ============================================================================
// CREATE/UPDATE PAYLOADS
// ============================================================================

export interface CreateSignatureRequestPayload {
  contract_id: string;
  title: string;
  message?: string;
  signing_order: SigningOrder;
  expires_at?: string;
  signatories: {
    email: string;
    name: string;
    company?: string;
    role?: string;
    order_index: number;
  }[];
}

export interface AddSignatoryPayload {
  signature_request_id: string;
  email: string;
  name: string;
  company?: string;
  role?: string;
  order_index?: number;
}

export interface CreateSessionPayload {
  contract_id: string;
  document_version_id: string;
  invited_users?: string[];
  invited_emails?: string[];
}

export interface InviteParticipantPayload {
  session_id: string;
  user_id?: string;
  email?: string;
  name: string;
}

// ============================================================================
// FILTER & QUERY TYPES
// ============================================================================

export interface SignatureRequestFilters {
  status?: SignatureRequestStatus | SignatureRequestStatus[];
  search?: string;
  contract_id?: string;
  created_by?: string;
  expires_before?: string;
  expires_after?: string;
}

export interface CertificateFilters {
  type?: CertificateType;
  status?: CertificateStatus | CertificateStatus[];
  search?: string;
  expires_before?: string;
  ca_id?: string;
}

export interface SessionFilters {
  status?: SessionStatus;
  contract_id?: string;
  created_by?: string;
  search?: string;
}

// ============================================================================
// STATS TYPES
// ============================================================================

export interface SignatureStats {
  total: number;
  draft: number;
  pending: number;
  in_progress: number;
  completed: number;
  expired: number;
  declined: number;
  expiring_soon: number; // Within 7 days
}

export interface CertificateStats {
  total_cas: number;
  active_cas: number;
  total_user_certs: number;
  active_user_certs: number;
  expired_certs: number;
  revoked_certs: number;
  expiring_soon: number; // Within 30 days
}

export interface SessionStats {
  total: number;
  active: number;
  ended_today: number;
  ended_this_week: number;
  average_participants: number;
}
