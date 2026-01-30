/**
 * Mock for Deno's HTTP server module
 * Not needed in Node.js test environment as edge functions aren't directly tested
 */

export type Handler = (request: Request) => Response | Promise<Response>;

export interface ServeOptions {
  port?: number;
  hostname?: string;
  signal?: AbortSignal;
  onListen?: (params: { hostname: string; port: number }) => void;
  onError?: (error: unknown) => Response | Promise<Response>;
}

export async function serve(
  handler: Handler,
  _options?: ServeOptions,
): Promise<void> {
  // Mock implementation - does nothing in test environment
  console.log('Mock Deno serve called');
}

export default serve;
