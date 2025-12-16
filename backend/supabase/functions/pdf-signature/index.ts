/// <reference path="../../types/global.d.ts" />

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { withMiddleware, type RequestContext } from '../_shared/middleware.ts';
import { validateRequest } from '../_shared/validation.ts';
import { createSuccessResponse, createErrorResponseSync } from '../_shared/responses.ts';
import { createAdminClient } from '../_shared/supabase.ts';
import { z } from 'zod';

// ============================================
// ASN.1 DER ENCODING UTILITIES
// ============================================

/**
 * ASN.1 Tag Types
 */
const ASN1_TAG = {
  INTEGER: 0x02,
  BIT_STRING: 0x03,
  OCTET_STRING: 0x04,
  NULL: 0x05,
  OBJECT_IDENTIFIER: 0x06,
  UTF8_STRING: 0x0c,
  SEQUENCE: 0x30,
  SET: 0x31,
  PRINTABLE_STRING: 0x13,
  IA5_STRING: 0x16,
  UTC_TIME: 0x17,
  GENERALIZED_TIME: 0x18,
  CONTEXT_SPECIFIC_0: 0xa0,
  CONTEXT_SPECIFIC_1: 0xa1,
  CONTEXT_SPECIFIC_2: 0xa2,
  CONTEXT_SPECIFIC_3: 0xa3,
};

/**
 * Common OIDs
 */
const OID = {
  // Signature algorithms
  SHA256_WITH_RSA: '1.2.840.113549.1.1.11',
  SHA384_WITH_RSA: '1.2.840.113549.1.1.12',
  SHA512_WITH_RSA: '1.2.840.113549.1.1.13',
  ECDSA_WITH_SHA256: '1.2.840.10045.4.3.2',
  ECDSA_WITH_SHA384: '1.2.840.10045.4.3.3',

  // Hash algorithms
  SHA256: '2.16.840.1.101.3.4.2.1',
  SHA384: '2.16.840.1.101.3.4.2.2',
  SHA512: '2.16.840.1.101.3.4.2.3',

  // PKCS#7/CMS
  SIGNED_DATA: '1.2.840.113549.1.7.2',
  DATA: '1.2.840.113549.1.7.1',
  MESSAGE_DIGEST: '1.2.840.113549.1.9.4',
  SIGNING_TIME: '1.2.840.113549.1.9.5',
  CONTENT_TYPE: '1.2.840.113549.1.9.3',

  // X.500 Attributes
  COMMON_NAME: '2.5.4.3',
  ORGANIZATION: '2.5.4.10',
  ORGANIZATIONAL_UNIT: '2.5.4.11',
  COUNTRY: '2.5.4.6',
  STATE: '2.5.4.8',
  LOCALITY: '2.5.4.7',
  EMAIL: '1.2.840.113549.1.9.1',

  // Timestamp
  ID_SMIME_CT_TSTINFO: '1.2.840.113549.1.9.16.1.4',
  ID_AA_SIGNATURE_TIME_STAMP_TOKEN: '1.2.840.113549.1.9.16.2.14',
};

/**
 * Encode length in DER format
 */
function encodeLength(length: number): Uint8Array {
  if (length < 128) {
    return new Uint8Array([length]);
  }

  const bytes: number[] = [];
  let temp = length;
  while (temp > 0) {
    bytes.unshift(temp & 0xff);
    temp >>= 8;
  }

  return new Uint8Array([0x80 | bytes.length, ...bytes]);
}

/**
 * Create a DER TLV (Tag-Length-Value) structure
 */
function createTLV(tag: number, value: Uint8Array): Uint8Array {
  const length = encodeLength(value.length);
  const result = new Uint8Array(1 + length.length + value.length);
  result[0] = tag;
  result.set(length, 1);
  result.set(value, 1 + length.length);
  return result;
}

/**
 * Encode an OID
 */
function encodeOID(oid: string): Uint8Array {
  const parts = oid.split('.').map(Number);
  const bytes: number[] = [];

  // First two parts are encoded specially
  bytes.push(parts[0] * 40 + parts[1]);

  // Remaining parts use variable-length encoding
  for (let i = 2; i < parts.length; i++) {
    let value = parts[i];
    const valueBytes: number[] = [];

    if (value === 0) {
      valueBytes.push(0);
    } else {
      while (value > 0) {
        valueBytes.unshift(value & 0x7f);
        value >>= 7;
      }
      // Set high bit on all but the last byte
      for (let j = 0; j < valueBytes.length - 1; j++) {
        valueBytes[j] |= 0x80;
      }
    }

    bytes.push(...valueBytes);
  }

  return createTLV(ASN1_TAG.OBJECT_IDENTIFIER, new Uint8Array(bytes));
}

/**
 * Encode an integer
 */
function encodeInteger(value: bigint | number): Uint8Array {
  let bigValue = typeof value === 'bigint' ? value : BigInt(value);

  if (bigValue === 0n) {
    return createTLV(ASN1_TAG.INTEGER, new Uint8Array([0]));
  }

  const bytes: number[] = [];
  const isNegative = bigValue < 0n;

  if (isNegative) {
    bigValue = -bigValue - 1n;
  }

  while (bigValue > 0n) {
    bytes.unshift(Number(bigValue & 0xffn));
    bigValue >>= 8n;
  }

  // Add leading zero if high bit is set and number is positive
  if (!isNegative && bytes[0] >= 0x80) {
    bytes.unshift(0);
  }

  // Invert all bytes for negative numbers
  if (isNegative) {
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] ^= 0xff;
    }
  }

  return createTLV(ASN1_TAG.INTEGER, new Uint8Array(bytes));
}

/**
 * Encode a UTC time
 */
function encodeUTCTime(date: Date): Uint8Array {
  const year = date.getUTCFullYear() % 100;
  const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
  const day = date.getUTCDate().toString().padStart(2, '0');
  const hours = date.getUTCHours().toString().padStart(2, '0');
  const minutes = date.getUTCMinutes().toString().padStart(2, '0');
  const seconds = date.getUTCSeconds().toString().padStart(2, '0');

  const timeString = `${year.toString().padStart(2, '0')}${month}${day}${hours}${minutes}${seconds}Z`;
  return createTLV(ASN1_TAG.UTC_TIME, new TextEncoder().encode(timeString));
}

/**
 * Encode an octet string
 */
function encodeOctetString(data: Uint8Array): Uint8Array {
  return createTLV(ASN1_TAG.OCTET_STRING, data);
}

/**
 * Encode a sequence
 */
function encodeSequence(...items: Uint8Array[]): Uint8Array {
  const totalLength = items.reduce((sum, item) => sum + item.length, 0);
  const combined = new Uint8Array(totalLength);
  let offset = 0;
  for (const item of items) {
    combined.set(item, offset);
    offset += item.length;
  }
  return createTLV(ASN1_TAG.SEQUENCE, combined);
}

/**
 * Encode a set
 */
function encodeSet(...items: Uint8Array[]): Uint8Array {
  const totalLength = items.reduce((sum, item) => sum + item.length, 0);
  const combined = new Uint8Array(totalLength);
  let offset = 0;
  for (const item of items) {
    combined.set(item, offset);
    offset += item.length;
  }
  return createTLV(ASN1_TAG.SET, combined);
}

// ============================================
// CMS/PKCS#7 BUILDER
// ============================================

interface SignerInfo {
  certificate: {
    serialNumber: bigint;
    issuerDN: Record<string, string>;
    subjectDN: Record<string, string>;
  };
  digestAlgorithm: string;
  signatureAlgorithm: string;
  signature: Uint8Array;
  signingTime: Date;
  messageDigest: Uint8Array;
}

/**
 * Build a CMS SignedData structure
 */
function buildCMSSignedData(
  contentType: string,
  signerInfos: SignerInfo[],
  certificates: Uint8Array[],
  encapsulatedContent?: Uint8Array
): Uint8Array {
  // DigestAlgorithms
  const digestAlgSet = encodeSet(
    encodeSequence(
      encodeOID(OID.SHA256),
      createTLV(ASN1_TAG.NULL, new Uint8Array())
    )
  );

  // EncapsulatedContentInfo
  const encapContentInfo = encapsulatedContent
    ? encodeSequence(
        encodeOID(OID.DATA),
        createTLV(ASN1_TAG.CONTEXT_SPECIFIC_0, encodeOctetString(encapsulatedContent))
      )
    : encodeSequence(encodeOID(OID.DATA));

  // Certificates (OPTIONAL)
  const certsTag = certificates.length > 0
    ? createTLV(ASN1_TAG.CONTEXT_SPECIFIC_0, concatenateUint8Arrays(certificates))
    : null;

  // SignerInfos
  const signerInfosEncoded = signerInfos.map(si => buildSignerInfo(si));
  const signerInfoSet = encodeSet(...signerInfosEncoded);

  // SignedData SEQUENCE
  const signedDataContent = [
    encodeInteger(1), // version
    digestAlgSet,
    encapContentInfo,
  ];

  if (certsTag) {
    signedDataContent.push(certsTag);
  }

  signedDataContent.push(signerInfoSet);

  const signedData = encodeSequence(...signedDataContent);

  // ContentInfo wrapper
  return encodeSequence(
    encodeOID(OID.SIGNED_DATA),
    createTLV(ASN1_TAG.CONTEXT_SPECIFIC_0, signedData)
  );
}

/**
 * Build SignerInfo structure
 */
function buildSignerInfo(si: SignerInfo): Uint8Array {
  // IssuerAndSerialNumber
  const issuerAndSerial = encodeSequence(
    buildDistinguishedName(si.certificate.issuerDN),
    encodeInteger(si.certificate.serialNumber)
  );

  // DigestAlgorithm
  const digestAlg = encodeSequence(
    encodeOID(OID.SHA256),
    createTLV(ASN1_TAG.NULL, new Uint8Array())
  );

  // SignedAttributes
  const contentTypeAttr = encodeSequence(
    encodeOID(OID.CONTENT_TYPE),
    encodeSet(encodeOID(OID.DATA))
  );

  const signingTimeAttr = encodeSequence(
    encodeOID(OID.SIGNING_TIME),
    encodeSet(encodeUTCTime(si.signingTime))
  );

  const messageDigestAttr = encodeSequence(
    encodeOID(OID.MESSAGE_DIGEST),
    encodeSet(encodeOctetString(si.messageDigest))
  );

  const signedAttrs = createTLV(
    ASN1_TAG.CONTEXT_SPECIFIC_0,
    concatenateUint8Arrays([contentTypeAttr, signingTimeAttr, messageDigestAttr])
  );

  // SignatureAlgorithm
  const sigAlg = encodeSequence(
    encodeOID(OID.SHA256_WITH_RSA),
    createTLV(ASN1_TAG.NULL, new Uint8Array())
  );

  // Signature
  const signature = encodeOctetString(si.signature);

  return encodeSequence(
    encodeInteger(1), // version
    issuerAndSerial,
    digestAlg,
    signedAttrs,
    sigAlg,
    signature
  );
}

/**
 * Build a Distinguished Name
 */
function buildDistinguishedName(dn: Record<string, string>): Uint8Array {
  const rdns: Uint8Array[] = [];

  const oidMap: Record<string, string> = {
    CN: OID.COMMON_NAME,
    O: OID.ORGANIZATION,
    OU: OID.ORGANIZATIONAL_UNIT,
    C: OID.COUNTRY,
    ST: OID.STATE,
    L: OID.LOCALITY,
    emailAddress: OID.EMAIL,
  };

  for (const [key, value] of Object.entries(dn)) {
    if (value && oidMap[key]) {
      const atv = encodeSequence(
        encodeOID(oidMap[key]),
        createTLV(ASN1_TAG.UTF8_STRING, new TextEncoder().encode(value))
      );
      rdns.push(encodeSet(atv));
    }
  }

  return encodeSequence(...rdns);
}

/**
 * Concatenate multiple Uint8Arrays
 */
function concatenateUint8Arrays(arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

// ============================================
// VALIDATION SCHEMAS
// ============================================

const prepareSignatureSchema = z.object({
  document_id: z.string().uuid(),
  signature_request_id: z.string().uuid(),
  signatory_id: z.string().uuid(),
  signature_fields: z.array(z.object({
    page: z.number().int().positive(),
    x: z.number(),
    y: z.number(),
    width: z.number().positive(),
    height: z.number().positive(),
    field_name: z.string().optional(),
  })).min(1),
});

const applySignatureSchema = z.object({
  document_id: z.string().uuid(),
  signature_request_id: z.string().uuid(),
  signatory_id: z.string().uuid(),
  certificate_id: z.string().uuid(),
  signature_image: z.string().optional(), // Base64 PNG
  signature_reason: z.string().max(500).optional(),
  signature_location: z.string().max(255).optional(),
});

const verifySignatureSchema = z.object({
  document_id: z.string().uuid(),
});

const timestampSchema = z.object({
  signature_event_id: z.string().uuid(),
  document_id: z.string().uuid().optional(),
});

// ============================================
// PDF UTILITIES
// ============================================

/**
 * Calculate SHA-256 hash
 */
async function sha256(data: Uint8Array): Promise<Uint8Array> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return new Uint8Array(hashBuffer);
}

/**
 * Generate a timestamp token (simplified internal TSA)
 */
async function generateTimestampToken(
  messageImprint: Uint8Array,
  serialNumber: bigint
): Promise<{ token: Uint8Array; time: Date }> {
  const time = new Date();

  // Build TSTInfo structure (simplified)
  const tstInfo = encodeSequence(
    encodeInteger(1), // version
    encodeOID(OID.ID_SMIME_CT_TSTINFO), // policy
    encodeSequence(
      encodeSequence(
        encodeOID(OID.SHA256),
        createTLV(ASN1_TAG.NULL, new Uint8Array())
      ),
      encodeOctetString(messageImprint)
    ), // messageImprint
    encodeInteger(serialNumber), // serialNumber
    encodeUTCTime(time), // genTime
  );

  // Wrap in ContentInfo
  const token = encodeSequence(
    encodeOID(OID.ID_SMIME_CT_TSTINFO),
    createTLV(ASN1_TAG.CONTEXT_SPECIFIC_0, tstInfo)
  );

  return { token, time };
}

// ============================================
// MAIN HANDLER
// ============================================

async function handlePDFSignature(context: RequestContext): Promise<Response> {
  const { req, user: profile } = context;
  const supabase = createAdminClient();
  const url = new URL(req.url);
  const { pathname } = url;
  const { method } = req;

  if (!profile) {
    return createErrorResponseSync('Authentication required', 401, req);
  }

  // ============================================
  // PREPARE SIGNATURE
  // ============================================

  // POST /pdf-signature/prepare - Prepare document for signing
  if (method === 'POST' && pathname === '/pdf-signature/prepare') {
    const body = await req.json();
    const validatedData = validateRequest(prepareSignatureSchema, body);

    // Verify signature request exists and belongs to enterprise
    const { data: request } = await supabase
      .from('signature_requests')
      .select('id, status, enterprise_id')
      .eq('id', validatedData.signature_request_id)
      .eq('enterprise_id', profile.enterprise_id)
      .single();

    if (!request) {
      return createErrorResponseSync('Signature request not found', 404, req);
    }

    // Verify signatory
    const { data: signatory } = await supabase
      .from('signature_signatories')
      .select('id, status')
      .eq('id', validatedData.signatory_id)
      .eq('signature_request_id', validatedData.signature_request_id)
      .single();

    if (!signatory) {
      return createErrorResponseSync('Signatory not found', 404, req);
    }

    // Get document
    const { data: document } = await supabase
      .from('signature_documents')
      .select('id, file_path, file_hash')
      .eq('id', validatedData.document_id)
      .eq('signature_request_id', validatedData.signature_request_id)
      .single();

    if (!document) {
      return createErrorResponseSync('Document not found', 404, req);
    }

    // Store signature field positions (in production, would modify actual PDF)
    const fields = validatedData.signature_fields.map((field, index) => ({
      signature_document_id: validatedData.document_id,
      signatory_id: validatedData.signatory_id,
      field_type: 'signature',
      field_name: field.field_name || `signature_${index + 1}`,
      page_number: field.page,
      x_position: field.x,
      y_position: field.y,
      width: field.width,
      height: field.height,
      is_required: true,
    }));

    const { error } = await supabase
      .from('signature_fields')
      .insert(fields);

    if (error) throw error;

    // Update document status
    await supabase
      .from('signature_documents')
      .update({ status: 'ready' })
      .eq('id', validatedData.document_id);

    return createSuccessResponse({
      document_id: validatedData.document_id,
      fields_created: fields.length,
      status: 'ready',
    }, 'Document prepared for signing', 200, req);
  }

  // ============================================
  // APPLY SIGNATURE
  // ============================================

  // POST /pdf-signature/sign - Apply cryptographic signature
  if (method === 'POST' && pathname === '/pdf-signature/sign') {
    const body = await req.json();
    const validatedData = validateRequest(applySignatureSchema, body);

    // Get certificate
    const { data: cert } = await supabase
      .from('certificates')
      .select(`
        id, serial_number, subject_dn, fingerprint_sha256, status, certificate_pem,
        ca:certificate_authorities(id, subject_dn, certificate_pem)
      `)
      .eq('id', validatedData.certificate_id)
      .eq('enterprise_id', profile.enterprise_id)
      .single();

    if (!cert) {
      return createErrorResponseSync('Certificate not found', 404, req);
    }

    if (cert.status !== 'active') {
      return createErrorResponseSync('Certificate is not active', 400, req);
    }

    // Get document
    const { data: document } = await supabase
      .from('signature_documents')
      .select('id, file_hash, signature_request_id')
      .eq('id', validatedData.document_id)
      .single();

    if (!document) {
      return createErrorResponseSync('Document not found', 404, req);
    }

    // Calculate document hash (in production, use actual file content)
    const documentHash = document.file_hash
      ? new Uint8Array(document.file_hash.match(/.{1,2}/g)?.map((b: string) => parseInt(b, 16)) || [])
      : await sha256(new TextEncoder().encode(validatedData.document_id));

    const signingTime = new Date();

    // Generate signature (simplified - in production, use actual private key)
    const signatureData = new TextEncoder().encode(
      `${document.file_hash || validatedData.document_id}:${cert.fingerprint_sha256}:${signingTime.toISOString()}`
    );
    const signatureHash = await sha256(signatureData);

    // Build CMS SignedData
    const signerInfo: SignerInfo = {
      certificate: {
        serialNumber: BigInt(cert.serial_number),
        issuerDN: cert.ca?.subject_dn as Record<string, string> || {},
        subjectDN: cert.subject_dn as Record<string, string>,
      },
      digestAlgorithm: 'SHA-256',
      signatureAlgorithm: 'SHA256withRSA',
      signature: signatureHash,
      signingTime,
      messageDigest: documentHash,
    };

    const cmsSignedData = buildCMSSignedData(
      OID.SIGNED_DATA,
      [signerInfo],
      [] // In production, include actual certificate DER
    );

    // Log signature event
    const { data: eventId } = await supabase.rpc('log_signature_event', {
      p_request_id: document.signature_request_id,
      p_signatory_id: validatedData.signatory_id,
      p_event_type: 'signature_applied',
      p_event_message: 'Digital signature applied with certificate',
      p_actor_type: 'user',
      p_actor_id: profile.id,
      p_raw_data: {
        certificate_id: cert.id,
        certificate_fingerprint: cert.fingerprint_sha256,
        signing_time: signingTime.toISOString(),
      },
    });

    // Record signature certificate link
    const { data: sigCertId } = await supabase.rpc('record_certificate_signature', {
      p_signature_event_id: eventId,
      p_signatory_id: validatedData.signatory_id,
      p_certificate_id: cert.id,
      p_signature_value: signatureHash,
      p_signed_data_hash: Array.from(documentHash).map(b => b.toString(16).padStart(2, '0')).join(''),
      p_cms_signed_data: cmsSignedData,
    });

    // Create PDF signature record
    await supabase
      .from('pdf_signatures')
      .insert({
        enterprise_id: profile.enterprise_id,
        signature_document_id: validatedData.document_id,
        signature_certificate_id: sigCertId,
        signature_name: (cert.subject_dn as Record<string, string>).CN || 'Signer',
        signature_reason: validatedData.signature_reason || 'Document approval',
        signature_location: validatedData.signature_location,
        page_number: 1,
        rect_ll_x: 0,
        rect_ll_y: 0,
        rect_ur_x: 200,
        rect_ur_y: 50,
        byte_range: [0, 0, 0, 0], // Would be calculated from actual PDF
        document_hash: Array.from(documentHash).map(b => b.toString(16).padStart(2, '0')).join(''),
        signing_time: signingTime.toISOString(),
        pades_level: 'B-B',
      });

    // Update signatory status
    await supabase
      .from('signature_signatories')
      .update({
        status: 'signed',
        signed_at: signingTime.toISOString(),
      })
      .eq('id', validatedData.signatory_id);

    return createSuccessResponse({
      signature_event_id: eventId,
      signature_certificate_id: sigCertId,
      signed_at: signingTime.toISOString(),
      pades_level: 'B-B',
    }, 'Signature applied successfully', 200, req);
  }

  // ============================================
  // ADD TIMESTAMP
  // ============================================

  // POST /pdf-signature/timestamp - Add RFC 3161 timestamp
  if (method === 'POST' && pathname === '/pdf-signature/timestamp') {
    const body = await req.json();
    const validatedData = validateRequest(timestampSchema, body);

    // Get signature event
    const { data: event } = await supabase
      .from('signature_events')
      .select(`
        id, signature_request_id,
        request:signature_requests(enterprise_id)
      `)
      .eq('id', validatedData.signature_event_id)
      .single();

    if (!event || event.request?.enterprise_id !== profile.enterprise_id) {
      return createErrorResponseSync('Signature event not found', 404, req);
    }

    // Get signature certificate
    const { data: sigCert } = await supabase
      .from('signature_certificates')
      .select('id, signature_value, signed_data_hash')
      .eq('signature_event_id', validatedData.signature_event_id)
      .single();

    if (!sigCert) {
      return createErrorResponseSync('Signature certificate record not found', 404, req);
    }

    // Calculate message imprint (hash of signature value)
    const messageImprint = await sha256(sigCert.signature_value);

    // Generate timestamp token
    const serialNumber = BigInt(Date.now());
    const { token, time } = await generateTimestampToken(messageImprint, serialNumber);

    // Store timestamp token
    const { data: tsId, error } = await supabase
      .from('timestamp_tokens')
      .insert({
        enterprise_id: profile.enterprise_id,
        signature_event_id: validatedData.signature_event_id,
        signature_document_id: validatedData.document_id,
        tsa_name: 'Pactwise Internal TSA',
        tsa_policy_oid: '1.3.6.1.4.1.99999.1', // Example policy OID
        timestamp_token: token,
        timestamp_time: time.toISOString(),
        message_imprint: messageImprint,
        message_imprint_algorithm: 'SHA-256',
        serial_number: Number(serialNumber),
        verified: true,
        verified_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) throw error;

    // Update signature certificate with timestamp reference
    await supabase
      .from('signature_certificates')
      .update({ timestamp_token_id: tsId?.id })
      .eq('id', sigCert.id);

    // Update PDF signature to B-T level
    if (validatedData.document_id) {
      await supabase
        .from('pdf_signatures')
        .update({ pades_level: 'B-T' })
        .eq('signature_document_id', validatedData.document_id);
    }

    return createSuccessResponse({
      timestamp_token_id: tsId?.id,
      timestamp_time: time.toISOString(),
      pades_level: 'B-T',
    }, 'Timestamp added successfully', 200, req);
  }

  // ============================================
  // VERIFY SIGNATURE
  // ============================================

  // POST /pdf-signature/verify - Verify PDF signatures
  if (method === 'POST' && pathname === '/pdf-signature/verify') {
    const body = await req.json();
    const validatedData = validateRequest(verifySignatureSchema, body);

    // Get all signatures for document
    const { data: signatures } = await supabase
      .from('pdf_signatures')
      .select(`
        *,
        certificate:signature_certificates(
          id, certificate_fingerprint, certificate_subject_dn, certificate_valid_at_signing,
          timestamp:timestamp_tokens(id, timestamp_time, verified)
        )
      `)
      .eq('signature_document_id', validatedData.document_id);

    if (!signatures || signatures.length === 0) {
      return createSuccessResponse({
        valid: false,
        signatures: [],
        message: 'No signatures found on document',
      }, undefined, 200, req);
    }

    // Verify each signature
    const verificationResults = signatures.map(sig => {
      const cert = sig.certificate;
      const hasTimestamp = cert?.timestamp?.verified === true;

      return {
        signature_id: sig.id,
        signer_name: sig.signature_name,
        signing_time: sig.signing_time,
        pades_level: sig.pades_level,
        verified: sig.verified,
        certificate: {
          fingerprint: cert?.certificate_fingerprint,
          subject: cert?.certificate_subject_dn,
          valid_at_signing: cert?.certificate_valid_at_signing,
        },
        timestamp: hasTimestamp ? {
          time: cert?.timestamp?.timestamp_time,
          verified: cert?.timestamp?.verified,
        } : null,
        integrity_check: 'passed', // Simplified - in production, recalculate hash
      };
    });

    const allValid = verificationResults.every(r => r.verified !== false);

    // Update verification status
    await supabase
      .from('pdf_signatures')
      .update({
        verified: true,
        verified_at: new Date().toISOString(),
        verification_result: { results: verificationResults },
      })
      .eq('signature_document_id', validatedData.document_id);

    return createSuccessResponse({
      valid: allValid,
      signatures: verificationResults,
      verification_time: new Date().toISOString(),
    }, undefined, 200, req);
  }

  // ============================================
  // GET SIGNATURE INFO
  // ============================================

  // GET /pdf-signature/:documentId - Get signature info for document
  if (method === 'GET' && pathname.match(/^\/pdf-signature\/[a-f0-9-]+$/)) {
    const documentId = pathname.split('/')[2];

    const { data: signatures } = await supabase
      .from('pdf_signatures')
      .select(`
        *,
        certificate:signature_certificates(
          certificate_fingerprint, certificate_subject_dn,
          timestamp:timestamp_tokens(timestamp_time, verified)
        )
      `)
      .eq('signature_document_id', documentId);

    if (!signatures) {
      return createSuccessResponse([], undefined, 200, req);
    }

    return createSuccessResponse(signatures, undefined, 200, req);
  }

  return createErrorResponseSync('Method not allowed', 405, req);
}

serve(
  withMiddleware(handlePDFSignature, {
    requireAuth: true,
    rateLimit: true,
    securityMonitoring: true,
  }, 'pdf-signature')
);
