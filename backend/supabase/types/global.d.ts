/**
 * Global type definitions for Deno environment
 */

declare global {
  namespace Deno {
    interface Env {
      get(key: string): string | undefined;
      set(key: string, value: string): void;
    }

    const env: Env;
    const args: string[];
    const version: {
      deno: string;
      v8: string;
      typescript: string;
    };
    
    function exit(code?: number): never;
    function cwd(): string;
    function readFile(path: string | URL): Promise<Uint8Array>;
    function writeFile(path: string | URL, data: Uint8Array): Promise<void>;
    function mkdir(path: string | URL, options?: { recursive?: boolean }): Promise<void>;
    function remove(path: string | URL, options?: { recursive?: boolean }): Promise<void>;
  }

  const Deno: typeof Deno;

  // Deno serve function for HTTP servers
  function serve(handler: (req: Request) => Response | Promise<Response>, options?: { port?: number; hostname?: string }): void;

  interface Response {
    headers: Headers;
  }

  interface Headers {
    set(name: string, value: string): void;
    get(name: string): string | null;
    entries(): IterableIterator<[string, string]>;
  }

  const crypto: {
    randomUUID(): string;
    getRandomValues<T extends ArrayBufferView | null>(array: T): T;
    subtle: SubtleCrypto;
  };

  interface SubtleCrypto {
    digest(algorithm: string, data: BufferSource): Promise<ArrayBuffer>;
    encrypt(
      algorithm: AlgorithmIdentifier | AesCbcParams | AesCtrParams | AesGcmParams,
      key: CryptoKey,
      data: BufferSource
    ): Promise<ArrayBuffer>;
    decrypt(
      algorithm: AlgorithmIdentifier | AesCbcParams | AesCtrParams | AesGcmParams,
      key: CryptoKey,
      data: BufferSource
    ): Promise<ArrayBuffer>;
    importKey(
      format: KeyFormat,
      keyData: BufferSource | JsonWebKey,
      algorithm: AlgorithmIdentifier | HmacImportParams | RsaHashedImportParams | EcKeyImportParams | AesKeyAlgorithm | Pbkdf2Params,
      extractable: boolean,
      keyUsages: KeyUsage[]
    ): Promise<CryptoKey>;
    deriveKey(
      algorithm: AlgorithmIdentifier | EcdhKeyDeriveParams | HkdfParams | Pbkdf2Params,
      baseKey: CryptoKey,
      derivedKeyType: AlgorithmIdentifier | AesDerivedKeyParams | HmacImportParams | HkdfParams,
      extractable: boolean,
      keyUsages: KeyUsage[]
    ): Promise<CryptoKey>;
  }

  // Browser compatibility functions
  function btoa(data: string): string;
  function atob(data: string): string;

  // TextEncoder/Decoder
  class TextEncoder {
    encode(input?: string): Uint8Array;
  }

  class TextDecoder {
    constructor(label?: string, options?: TextDecoderOptions);
    decode(input?: BufferSource, options?: TextDecodeOptions): string;
  }

  interface TextDecoderOptions {
    fatal?: boolean;
    ignoreBOM?: boolean;
  }

  interface TextDecodeOptions {
    stream?: boolean;
  }

  // Timeout types for Node.js compatibility
  type Timeout = number;
  function setTimeout(callback: (...args: unknown[]) => void, ms?: number, ...args: unknown[]): Timeout;
  function clearTimeout(timeoutId: Timeout | undefined): void;
}

export {};