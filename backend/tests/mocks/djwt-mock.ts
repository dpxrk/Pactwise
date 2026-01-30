/**
 * Mock for Deno's djwt JWT library
 * Provides basic JWT functionality for testing
 */

export interface Payload {
  iss?: string;
  sub?: string;
  aud?: string | string[];
  exp?: number;
  nbf?: number;
  iat?: number;
  jti?: string;
  [key: string]: unknown;
}

export interface Header {
  alg: string;
  typ?: string;
}

export function getNumericDate(exp: number): number {
  return Math.round(Date.now() / 1000) + exp;
}

export async function create(
  _header: Header,
  payload: Payload,
  _key: CryptoKey | string,
): Promise<string> {
  // Create a simple mock JWT for testing
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = Buffer.from('mock-signature').toString('base64url');
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

export async function verify(
  jwt: string,
  _key: CryptoKey | string,
): Promise<Payload> {
  const parts = jwt.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid JWT format');
  }
  const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
  return payload;
}

export async function decode(jwt: string): Promise<[Header, Payload, Uint8Array]> {
  const parts = jwt.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid JWT format');
  }
  const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
  const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
  const signature = new Uint8Array(Buffer.from(parts[2], 'base64url'));
  return [header, payload, signature];
}
