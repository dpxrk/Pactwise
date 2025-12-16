/// <reference path="../../types/global.d.ts" />

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { withMiddleware, type RequestContext } from '../_shared/middleware.ts';
import { getUserPermissions } from '../_shared/auth.ts';
import { validateRequest } from '../_shared/validation.ts';
import { createSuccessResponse, createErrorResponseSync, createPaginatedResponse } from '../_shared/responses.ts';
import { createAdminClient } from '../_shared/supabase.ts';
import { z } from 'zod';

// ============================================
// VALIDATION SCHEMAS
// ============================================

const keyAlgorithmEnum = z.enum(['RSA-2048', 'RSA-4096', 'ECDSA-P256', 'ECDSA-P384']);

const subjectDNSchema = z.object({
  CN: z.string().min(1).max(255), // Common Name
  O: z.string().min(1).max(255).optional(), // Organization
  OU: z.string().max(255).optional(), // Organizational Unit
  C: z.string().length(2).optional(), // Country (2-letter ISO)
  ST: z.string().max(255).optional(), // State/Province
  L: z.string().max(255).optional(), // Locality/City
  emailAddress: z.string().email().optional(),
});

const createCASchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  subject_dn: subjectDNSchema,
  key_algorithm: keyAlgorithmEnum.optional().default('RSA-2048'),
  validity_years: z.number().int().min(1).max(30).optional().default(10),
  is_root: z.boolean().optional().default(true),
  parent_ca_id: z.string().uuid().optional(),
});

const createCertificateSchema = z.object({
  ca_id: z.string().uuid(),
  subject_dn: subjectDNSchema,
  email: z.string().email(),
  user_id: z.string().uuid().optional(),
  validity_days: z.number().int().min(1).max(3650).optional().default(365),
});

const revokeCertificateSchema = z.object({
  reason: z.enum([
    'unspecified', 'keyCompromise', 'caCompromise', 'affiliationChanged',
    'superseded', 'cessationOfOperation', 'certificateHold', 'privilegeWithdrawn'
  ]).optional().default('unspecified'),
});

const paginationSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(50),
});

// ============================================
// CRYPTO UTILITIES
// ============================================

interface KeyPair {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
}

/**
 * Generate an RSA key pair
 */
async function generateRSAKeyPair(bits: 2048 | 4096 = 2048): Promise<KeyPair> {
  return await crypto.subtle.generateKey(
    {
      name: 'RSASSA-PKCS1-v1_5',
      modulusLength: bits,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['sign', 'verify']
  );
}

/**
 * Generate an ECDSA key pair
 */
async function generateECDSAKeyPair(curve: 'P-256' | 'P-384'): Promise<KeyPair> {
  return await crypto.subtle.generateKey(
    {
      name: 'ECDSA',
      namedCurve: curve,
    },
    true,
    ['sign', 'verify']
  );
}

/**
 * Export public key to PEM format
 */
async function exportPublicKeyPEM(key: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey('spki', key);
  const base64 = btoa(String.fromCharCode(...new Uint8Array(exported)));
  const formatted = base64.match(/.{1,64}/g)?.join('\n') || base64;
  return `-----BEGIN PUBLIC KEY-----\n${formatted}\n-----END PUBLIC KEY-----`;
}

/**
 * Export private key to encrypted PEM format (PKCS#8)
 */
async function exportPrivateKeyEncrypted(
  key: CryptoKey,
  encryptionKey: CryptoKey,
  iv: Uint8Array
): Promise<Uint8Array> {
  // Export private key
  const exported = await crypto.subtle.exportKey('pkcs8', key);

  // Encrypt with AES-256-GCM
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    encryptionKey,
    exported
  );

  // Return IV + encrypted data
  const result = new Uint8Array(iv.length + encrypted.byteLength);
  result.set(iv);
  result.set(new Uint8Array(encrypted), iv.length);
  return result;
}

/**
 * Derive encryption key from enterprise ID (simplified - in production use proper KMS)
 */
async function deriveEncryptionKey(enterpriseId: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  // In production, this should use a proper key management system
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(enterpriseId + Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.slice(0, 32)),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode('pactwise-pki-v1'),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Generate a self-signed certificate (simplified X.509 structure)
 * In production, use a proper ASN.1/DER library
 */
function generateCertificatePEM(
  subjectDN: Record<string, string | undefined>,
  publicKeyPEM: string,
  serialNumber: bigint,
  validFrom: Date,
  validUntil: Date,
  isCA: boolean = false
): string {
  // This is a simplified certificate representation
  // In production, generate proper ASN.1/DER encoded X.509 certificate
  const certData = {
    version: 3,
    serialNumber: serialNumber.toString(),
    signature: { algorithm: 'sha256WithRSAEncryption' },
    issuer: subjectDN,
    validity: {
      notBefore: validFrom.toISOString(),
      notAfter: validUntil.toISOString(),
    },
    subject: subjectDN,
    subjectPublicKeyInfo: publicKeyPEM,
    extensions: {
      basicConstraints: { cA: isCA, pathLenConstraint: isCA ? 0 : undefined },
      keyUsage: isCA
        ? ['keyCertSign', 'cRLSign']
        : ['digitalSignature', 'nonRepudiation'],
      extendedKeyUsage: isCA ? [] : ['emailProtection'],
    },
  };

  // Encode as base64 JSON (simplified - should be DER in production)
  const base64 = btoa(JSON.stringify(certData));
  const formatted = base64.match(/.{1,64}/g)?.join('\n') || base64;

  return `-----BEGIN CERTIFICATE-----\n${formatted}\n-----END CERTIFICATE-----`;
}

/**
 * Calculate SHA-256 fingerprint
 */
async function calculateFingerprint(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join(':')
    .toUpperCase();
}

// ============================================
// MAIN HANDLER
// ============================================

async function handleNativePKI(context: RequestContext): Promise<Response> {
  const { req, user: profile } = context;
  const supabase = createAdminClient();
  const url = new URL(req.url);
  const { pathname } = url;
  const { method } = req;

  // ============================================
  // PUBLIC CRL ENDPOINT (No auth required)
  // ============================================

  // GET /native-pki/crl/:caId - Get Certificate Revocation List
  if (method === 'GET' && pathname.match(/^\/native-pki\/crl\/[a-f0-9-]+$/)) {
    const caId = pathname.split('/')[3];

    // Get CA info
    const { data: ca } = await supabase
      .from('certificate_authorities')
      .select('id, name, subject_dn, fingerprint_sha256, crl_number')
      .eq('id', caId)
      .single();

    if (!ca) {
      return createErrorResponseSync('CA not found', 404, req);
    }

    // Get revoked certificates
    const { data: entries } = await supabase.rpc('get_crl_entries', {
      p_ca_id: caId,
    });

    // Build CRL structure (simplified - should be DER encoded in production)
    const crl = {
      version: 2,
      signature: { algorithm: 'sha256WithRSAEncryption' },
      issuer: ca.subject_dn,
      thisUpdate: new Date().toISOString(),
      nextUpdate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      crlNumber: ca.crl_number || 0,
      revokedCertificates: entries?.map((e: { serial_number: string; revocation_date: string; reason: string }) => ({
        serialNumber: e.serial_number,
        revocationDate: e.revocation_date,
        crlEntryExtensions: {
          reasonCode: e.reason,
        },
      })) || [],
    };

    // Return as JSON (in production, return DER-encoded CRL)
    return new Response(JSON.stringify(crl, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/pkix-crl',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  }

  // ============================================
  // AUTHENTICATED ROUTES
  // ============================================

  if (!profile) {
    return createErrorResponseSync('Authentication required', 401, req);
  }

  const permissions = await getUserPermissions(supabase, profile, 'settings');

  // ============================================
  // CERTIFICATE AUTHORITY ROUTES
  // ============================================

  // GET /native-pki/ca - List Certificate Authorities
  if (method === 'GET' && pathname === '/native-pki/ca') {
    const params = Object.fromEntries(url.searchParams);
    const { page, limit } = validateRequest(paginationSchema, params);
    const offset = (page - 1) * limit;

    const { data, error, count } = await supabase
      .from('certificate_authorities')
      .select('id, name, description, subject_dn, key_algorithm, serial_number, fingerprint_sha256, valid_from, valid_until, is_root, status, created_at', { count: 'exact' })
      .eq('enterprise_id', profile.enterprise_id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return createPaginatedResponse(data || [], {
      page,
      limit,
      total: count || 0,
    }, req);
  }

  // GET /native-pki/ca/:id - Get CA details
  if (method === 'GET' && pathname.match(/^\/native-pki\/ca\/[a-f0-9-]+$/)) {
    const caId = pathname.split('/')[3];

    const { data, error } = await supabase
      .from('certificate_authorities')
      .select(`
        *,
        certificates:certificates(count)
      `)
      .eq('id', caId)
      .eq('enterprise_id', profile.enterprise_id)
      .single();

    if (error) throw error;
    if (!data) {
      return createErrorResponseSync('CA not found', 404, req);
    }

    // Don't expose private key
    const { private_key_encrypted: _, ...safeData } = data;

    return createSuccessResponse(safeData, undefined, 200, req);
  }

  // POST /native-pki/ca - Create Certificate Authority
  if (method === 'POST' && pathname === '/native-pki/ca') {
    if (!permissions.canManage) {
      return createErrorResponseSync('Admin permissions required', 403, req);
    }

    const body = await req.json();
    const validatedData = validateRequest(createCASchema, body);

    // Generate key pair based on algorithm
    let keyPair: KeyPair;
    if (validatedData.key_algorithm.startsWith('RSA')) {
      const bits = validatedData.key_algorithm === 'RSA-4096' ? 4096 : 2048;
      keyPair = await generateRSAKeyPair(bits);
    } else {
      const curve = validatedData.key_algorithm === 'ECDSA-P384' ? 'P-384' : 'P-256';
      keyPair = await generateECDSAKeyPair(curve);
    }

    // Export public key
    const publicKeyPEM = await exportPublicKeyPEM(keyPair.publicKey);

    // Encrypt private key
    const encryptionKey = await deriveEncryptionKey(profile.enterprise_id);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const privateKeyEncrypted = await exportPrivateKeyEncrypted(keyPair.privateKey, encryptionKey, iv);

    // Generate serial number
    const serialNumber = BigInt('0x' + crypto.getRandomValues(new Uint8Array(16))
      .reduce((s, b) => s + b.toString(16).padStart(2, '0'), ''));

    // Calculate validity
    const validFrom = new Date();
    const validUntil = new Date();
    validUntil.setFullYear(validUntil.getFullYear() + validatedData.validity_years);

    // Generate certificate
    const certificatePEM = generateCertificatePEM(
      validatedData.subject_dn as Record<string, string>,
      publicKeyPEM,
      serialNumber,
      validFrom,
      validUntil,
      true
    );

    // Calculate fingerprint
    const fingerprint = await calculateFingerprint(certificatePEM);

    // Store in database
    const { data: caId, error } = await supabase.rpc('create_certificate_authority', {
      p_enterprise_id: profile.enterprise_id,
      p_name: validatedData.name,
      p_subject_dn: validatedData.subject_dn,
      p_public_key_pem: publicKeyPEM,
      p_private_key_encrypted: privateKeyEncrypted,
      p_certificate_pem: certificatePEM,
      p_key_algorithm: validatedData.key_algorithm,
      p_validity_years: validatedData.validity_years,
      p_is_root: validatedData.is_root,
      p_parent_ca_id: validatedData.parent_ca_id || null,
      p_created_by: profile.id,
    });

    if (error) throw error;

    // Initialize native provider if not exists
    await supabase.rpc('initialize_native_signature_provider', {
      p_enterprise_id: profile.enterprise_id,
      p_created_by: profile.id,
    });

    // Get created CA
    const { data: ca } = await supabase
      .from('certificate_authorities')
      .select('id, name, subject_dn, key_algorithm, serial_number, fingerprint_sha256, valid_from, valid_until, status, certificate_pem')
      .eq('id', caId)
      .single();

    return createSuccessResponse(ca, 'Certificate Authority created', 201, req);
  }

  // DELETE /native-pki/ca/:id - Delete CA (soft delete by revoking)
  if (method === 'DELETE' && pathname.match(/^\/native-pki\/ca\/[a-f0-9-]+$/)) {
    if (!permissions.canManage) {
      return createErrorResponseSync('Admin permissions required', 403, req);
    }

    const caId = pathname.split('/')[3];

    // Check for active certificates
    const { count } = await supabase
      .from('certificates')
      .select('*', { count: 'exact', head: true })
      .eq('ca_id', caId)
      .eq('status', 'active');

    if (count && count > 0) {
      return createErrorResponseSync('Cannot delete CA with active certificates', 400, req);
    }

    // Soft delete by marking as revoked
    const { error } = await supabase
      .from('certificate_authorities')
      .update({
        status: 'revoked',
        revoked_at: new Date().toISOString(),
        revocation_reason: 'CA deleted by administrator',
      })
      .eq('id', caId)
      .eq('enterprise_id', profile.enterprise_id);

    if (error) throw error;

    return createSuccessResponse({ revoked: true }, 'Certificate Authority revoked', 200, req);
  }

  // ============================================
  // USER CERTIFICATE ROUTES
  // ============================================

  // GET /native-pki/certificates - List certificates
  if (method === 'GET' && pathname === '/native-pki/certificates') {
    const params = Object.fromEntries(url.searchParams);
    const { page, limit } = validateRequest(paginationSchema, params);
    const offset = (page - 1) * limit;
    const status = params.status;
    const caId = params.ca_id;
    const email = params.email;

    let query = supabase
      .from('certificates')
      .select(`
        id, subject_dn, email, user_id, serial_number, fingerprint_sha256,
        valid_from, valid_until, status, signature_count, last_used_at, created_at,
        ca:certificate_authorities(id, name)
      `, { count: 'exact' })
      .eq('enterprise_id', profile.enterprise_id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }
    if (caId) {
      query = query.eq('ca_id', caId);
    }
    if (email) {
      query = query.eq('email', email);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    return createPaginatedResponse(data || [], {
      page,
      limit,
      total: count || 0,
    }, req);
  }

  // GET /native-pki/certificates/:id - Get certificate details
  if (method === 'GET' && pathname.match(/^\/native-pki\/certificates\/[a-f0-9-]+$/)) {
    const certId = pathname.split('/')[3];

    const { data, error } = await supabase
      .from('certificates')
      .select(`
        *,
        ca:certificate_authorities(id, name, subject_dn)
      `)
      .eq('id', certId)
      .eq('enterprise_id', profile.enterprise_id)
      .single();

    if (error) throw error;
    if (!data) {
      return createErrorResponseSync('Certificate not found', 404, req);
    }

    return createSuccessResponse(data, undefined, 200, req);
  }

  // POST /native-pki/certificates - Issue new certificate
  if (method === 'POST' && pathname === '/native-pki/certificates') {
    const body = await req.json();
    const validatedData = validateRequest(createCertificateSchema, body);

    // Verify CA exists and is active
    const { data: ca } = await supabase
      .from('certificate_authorities')
      .select('id, key_algorithm, status')
      .eq('id', validatedData.ca_id)
      .eq('enterprise_id', profile.enterprise_id)
      .single();

    if (!ca) {
      return createErrorResponseSync('Certificate Authority not found', 404, req);
    }

    if (ca.status !== 'active') {
      return createErrorResponseSync('Certificate Authority is not active', 400, req);
    }

    // Generate key pair for user (in production, this should come from client)
    let keyPair: KeyPair;
    if (ca.key_algorithm.startsWith('RSA')) {
      const bits = ca.key_algorithm === 'RSA-4096' ? 4096 : 2048;
      keyPair = await generateRSAKeyPair(bits);
    } else {
      const curve = ca.key_algorithm === 'ECDSA-P384' ? 'P-384' : 'P-256';
      keyPair = await generateECDSAKeyPair(curve);
    }

    const publicKeyPEM = await exportPublicKeyPEM(keyPair.publicKey);

    // Calculate validity
    const validFrom = new Date();
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + validatedData.validity_days);

    // Get next serial number
    const { data: serialNumber } = await supabase.rpc('get_next_ca_serial', {
      p_ca_id: validatedData.ca_id,
    });

    // Generate certificate
    const certificatePEM = generateCertificatePEM(
      { ...validatedData.subject_dn, emailAddress: validatedData.email } as Record<string, string>,
      publicKeyPEM,
      BigInt(serialNumber),
      validFrom,
      validUntil,
      false
    );

    // Create certificate record
    const { data: certId, error } = await supabase.rpc('create_user_certificate', {
      p_enterprise_id: profile.enterprise_id,
      p_ca_id: validatedData.ca_id,
      p_subject_dn: { ...validatedData.subject_dn, emailAddress: validatedData.email },
      p_email: validatedData.email,
      p_user_id: validatedData.user_id || null,
      p_public_key_pem: publicKeyPEM,
      p_certificate_pem: certificatePEM,
      p_validity_days: validatedData.validity_days,
      p_created_by: profile.id,
    });

    if (error) throw error;

    // Get created certificate
    const { data: cert } = await supabase
      .from('certificates')
      .select('id, subject_dn, email, serial_number, fingerprint_sha256, valid_from, valid_until, status, certificate_pem')
      .eq('id', certId)
      .single();

    return createSuccessResponse(cert, 'Certificate issued', 201, req);
  }

  // POST /native-pki/certificates/:id/revoke - Revoke certificate
  if (method === 'POST' && pathname.match(/^\/native-pki\/certificates\/[a-f0-9-]+\/revoke$/)) {
    const certId = pathname.split('/')[3];
    const body = await req.json();
    const { reason } = validateRequest(revokeCertificateSchema, body);

    // Verify certificate exists
    const { data: cert } = await supabase
      .from('certificates')
      .select('id, status')
      .eq('id', certId)
      .eq('enterprise_id', profile.enterprise_id)
      .single();

    if (!cert) {
      return createErrorResponseSync('Certificate not found', 404, req);
    }

    if (cert.status !== 'active') {
      return createErrorResponseSync('Certificate is not active', 400, req);
    }

    // Revoke certificate
    const { data: success, error } = await supabase.rpc('revoke_certificate', {
      p_certificate_id: certId,
      p_reason: reason,
      p_revoked_by: profile.id,
    });

    if (error) throw error;

    if (!success) {
      return createErrorResponseSync('Failed to revoke certificate', 500, req);
    }

    return createSuccessResponse({ revoked: true, reason }, 'Certificate revoked', 200, req);
  }

  // GET /native-pki/certificates/my - Get current user's active certificate
  if (method === 'GET' && pathname === '/native-pki/certificates/my') {
    const { data, error } = await supabase.rpc('get_active_certificate_for_user', {
      p_enterprise_id: profile.enterprise_id,
      p_user_email: profile.email,
    });

    if (error) throw error;

    if (!data || data.length === 0) {
      return createSuccessResponse(null, 'No active certificate found', 200, req);
    }

    return createSuccessResponse(data[0], undefined, 200, req);
  }

  // ============================================
  // TIMESTAMP TOKEN ROUTES
  // ============================================

  // GET /native-pki/timestamps - List timestamp tokens
  if (method === 'GET' && pathname === '/native-pki/timestamps') {
    const params = Object.fromEntries(url.searchParams);
    const { page, limit } = validateRequest(paginationSchema, params);
    const offset = (page - 1) * limit;

    const { data, error, count } = await supabase
      .from('timestamp_tokens')
      .select('id, tsa_name, timestamp_time, message_imprint_algorithm, serial_number, verified, created_at', { count: 'exact' })
      .eq('enterprise_id', profile.enterprise_id)
      .order('timestamp_time', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return createPaginatedResponse(data || [], {
      page,
      limit,
      total: count || 0,
    }, req);
  }

  // ============================================
  // STATS
  // ============================================

  // GET /native-pki/stats - Get PKI statistics
  if (method === 'GET' && pathname === '/native-pki/stats') {
    const [caResult, certResult, tsResult] = await Promise.all([
      supabase
        .from('certificate_authorities')
        .select('status', { count: 'exact' })
        .eq('enterprise_id', profile.enterprise_id),
      supabase
        .from('certificates')
        .select('status', { count: 'exact' })
        .eq('enterprise_id', profile.enterprise_id),
      supabase
        .from('timestamp_tokens')
        .select('verified', { count: 'exact' })
        .eq('enterprise_id', profile.enterprise_id),
    ]);

    const caData = caResult.data || [];
    const certData = certResult.data || [];

    const stats = {
      certificate_authorities: {
        total: caData.length,
        active: caData.filter(ca => ca.status === 'active').length,
        revoked: caData.filter(ca => ca.status === 'revoked').length,
      },
      certificates: {
        total: certData.length,
        active: certData.filter(c => c.status === 'active').length,
        revoked: certData.filter(c => c.status === 'revoked').length,
        expired: certData.filter(c => c.status === 'expired').length,
      },
      timestamps: {
        total: tsResult.count || 0,
      },
    };

    return createSuccessResponse(stats, undefined, 200, req);
  }

  return createErrorResponseSync('Method not allowed', 405, req);
}

// Serve with conditional auth (CRL endpoint doesn't require auth)
serve(
  withMiddleware(handleNativePKI, {
    requireAuth: false,
    rateLimit: true,
    securityMonitoring: true,
  }, 'native-pki')
);
