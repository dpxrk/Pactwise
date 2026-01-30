/**
 * Mock for Deno's base64 encoding module
 * Redirects to Node.js Buffer API
 */

export function encode(data: Uint8Array | string): string {
  if (typeof data === 'string') {
    return Buffer.from(data).toString('base64');
  }
  return Buffer.from(data).toString('base64');
}

export function decode(b64: string): Uint8Array {
  return new Uint8Array(Buffer.from(b64, 'base64'));
}
