/**
 * Compression Middleware for Edge Functions
 * Provides request/response compression for optimized data transfer
 */

import type { RequestContext } from './middleware.ts';

interface CompressionConfig {
  enableRequestDecompression: boolean;
  enableResponseCompression: boolean;
  compressionThreshold: number; // Minimum size in bytes to compress
  compressionLevel: CompressionLevel;
  supportedEncodings: CompressionEncoding[];
  excludeContentTypes: string[];
}

type CompressionEncoding = 'gzip' | 'deflate' | 'br' | 'identity';
type CompressionLevel = 'fast' | 'default' | 'best';

interface CompressionStats {
  totalRequests: number;
  compressedResponses: number;
  decompressedRequests: number;
  totalBytesOriginal: number;
  totalBytesCompressed: number;
  avgCompressionRatio: number;
}

/**
 * Compression middleware for optimizing data transfer
 */
export class CompressionMiddleware {
  private config: CompressionConfig;
  private stats: CompressionStats;
  private encoder: TextEncoder;
  private decoder: TextDecoder;

  constructor(config: Partial<CompressionConfig> = {}) {
    this.config = {
      enableRequestDecompression: config.enableRequestDecompression ?? true,
      enableResponseCompression: config.enableResponseCompression ?? true,
      compressionThreshold: config.compressionThreshold || 1024, // 1KB default
      compressionLevel: config.compressionLevel || 'default',
      supportedEncodings: config.supportedEncodings || ['gzip', 'deflate', 'br'],
      excludeContentTypes: config.excludeContentTypes || [
        'image/',
        'video/',
        'audio/',
        'application/pdf',
        'application/zip',
      ],
    };

    this.stats = {
      totalRequests: 0,
      compressedResponses: 0,
      decompressedRequests: 0,
      totalBytesOriginal: 0,
      totalBytesCompressed: 0,
      avgCompressionRatio: 0,
    };

    this.encoder = new TextEncoder();
    this.decoder = new TextDecoder();
  }

  /**
   * Process incoming request for decompression if needed
   */
  async processRequest(req: Request): Promise<Request> {
    this.stats.totalRequests++;

    if (!this.config.enableRequestDecompression) {
      return req;
    }

    const contentEncoding = req.headers.get('content-encoding');
    if (!contentEncoding || contentEncoding === 'identity') {
      return req;
    }

    try {
      const decompressedBody = await this.decompressBody(
        await req.arrayBuffer(),
        contentEncoding as CompressionEncoding
      );

      this.stats.decompressedRequests++;

      // Create new request with decompressed body
      const newHeaders = new Headers(req.headers);
      newHeaders.delete('content-encoding');
      newHeaders.set('content-length', decompressedBody.byteLength.toString());

      return new Request(req.url, {
        method: req.method,
        headers: newHeaders,
        body: decompressedBody,
      });
    } catch (error) {
      console.error('Request decompression failed:', error);
      return req; // Return original request if decompression fails
    }
  }

  /**
   * Process outgoing response for compression if beneficial
   */
  async processResponse(
    response: Response,
    req: Request
  ): Promise<Response> {
    if (!this.config.enableResponseCompression) {
      return response;
    }

    // Check if client supports compression
    const acceptEncoding = req.headers.get('accept-encoding') || '';
    const supportedEncoding = this.selectBestEncoding(acceptEncoding);
    
    if (!supportedEncoding || supportedEncoding === 'identity') {
      return response;
    }

    // Check if content type should be compressed
    const contentType = response.headers.get('content-type') || '';
    if (this.shouldExcludeContentType(contentType)) {
      return response;
    }

    // Check if already compressed
    if (response.headers.get('content-encoding')) {
      return response;
    }

    try {
      // Get response body
      const body = await response.arrayBuffer();
      const originalSize = body.byteLength;

      // Skip compression for small payloads
      if (originalSize < this.config.compressionThreshold) {
        return response;
      }

      // Compress the body
      const compressedBody = await this.compressBody(body, supportedEncoding);
      const compressedSize = compressedBody.byteLength;

      // Only use compression if it actually reduces size
      if (compressedSize >= originalSize * 0.9) {
        return response;
      }

      // Update statistics
      this.stats.compressedResponses++;
      this.stats.totalBytesOriginal += originalSize;
      this.stats.totalBytesCompressed += compressedSize;
      this.updateCompressionRatio();

      // Create compressed response
      const newHeaders = new Headers(response.headers);
      newHeaders.set('content-encoding', supportedEncoding);
      newHeaders.set('content-length', compressedSize.toString());
      newHeaders.set('vary', 'accept-encoding');
      
      // Add compression info headers for debugging
      if (Deno.env.get('DEBUG_COMPRESSION') === 'true') {
        newHeaders.set('x-original-size', originalSize.toString());
        newHeaders.set('x-compressed-size', compressedSize.toString());
        newHeaders.set('x-compression-ratio', 
          (compressedSize / originalSize).toFixed(3)
        );
      }

      return new Response(compressedBody, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders,
      });
    } catch (error) {
      console.error('Response compression failed:', error);
      return response; // Return original response if compression fails
    }
  }

  /**
   * Compress data using the specified encoding
   */
  private async compressBody(
    data: ArrayBuffer,
    encoding: CompressionEncoding
  ): Promise<ArrayBuffer> {
    switch (encoding) {
      case 'gzip':
        return this.gzipCompress(data);
      case 'deflate':
        return this.deflateCompress(data);
      case 'br':
        return this.brotliCompress(data);
      default:
        return data;
    }
  }

  /**
   * Decompress data using the specified encoding
   */
  private async decompressBody(
    data: ArrayBuffer,
    encoding: CompressionEncoding
  ): Promise<ArrayBuffer> {
    switch (encoding) {
      case 'gzip':
        return this.gzipDecompress(data);
      case 'deflate':
        return this.deflateDecompress(data);
      case 'br':
        return this.brotliDecompress(data);
      default:
        return data;
    }
  }

  /**
   * GZIP compression implementation
   */
  private async gzipCompress(data: ArrayBuffer): Promise<ArrayBuffer> {
    // Using Web Streams API CompressionStream
    const stream = new Response(data).body;
    if (!stream) throw new Error('Failed to create stream');
    
    const compressedStream = stream.pipeThrough(
      new CompressionStream('gzip')
    );
    
    return new Response(compressedStream).arrayBuffer();
  }

  /**
   * GZIP decompression implementation
   */
  private async gzipDecompress(data: ArrayBuffer): Promise<ArrayBuffer> {
    const stream = new Response(data).body;
    if (!stream) throw new Error('Failed to create stream');
    
    const decompressedStream = stream.pipeThrough(
      new DecompressionStream('gzip')
    );
    
    return new Response(decompressedStream).arrayBuffer();
  }

  /**
   * Deflate compression implementation
   */
  private async deflateCompress(data: ArrayBuffer): Promise<ArrayBuffer> {
    const stream = new Response(data).body;
    if (!stream) throw new Error('Failed to create stream');
    
    const compressedStream = stream.pipeThrough(
      new CompressionStream('deflate')
    );
    
    return new Response(compressedStream).arrayBuffer();
  }

  /**
   * Deflate decompression implementation
   */
  private async deflateDecompress(data: ArrayBuffer): Promise<ArrayBuffer> {
    const stream = new Response(data).body;
    if (!stream) throw new Error('Failed to create stream');
    
    const decompressedStream = stream.pipeThrough(
      new DecompressionStream('deflate')
    );
    
    return new Response(decompressedStream).arrayBuffer();
  }

  /**
   * Brotli compression implementation
   * Note: Brotli is not available in all environments
   */
  private async brotliCompress(data: ArrayBuffer): Promise<ArrayBuffer> {
    // Fallback to gzip if Brotli is not available
    try {
      const stream = new Response(data).body;
      if (!stream) throw new Error('Failed to create stream');
      
      // @ts-ignore - Brotli might not be available
      const compressedStream = stream.pipeThrough(
        new CompressionStream('br')
      );
      
      return new Response(compressedStream).arrayBuffer();
    } catch {
      // Fallback to gzip
      return this.gzipCompress(data);
    }
  }

  /**
   * Brotli decompression implementation
   */
  private async brotliDecompress(data: ArrayBuffer): Promise<ArrayBuffer> {
    try {
      const stream = new Response(data).body;
      if (!stream) throw new Error('Failed to create stream');
      
      // @ts-ignore - Brotli might not be available
      const decompressedStream = stream.pipeThrough(
        new DecompressionStream('br')
      );
      
      return new Response(decompressedStream).arrayBuffer();
    } catch {
      // Fallback to gzip
      return this.gzipDecompress(data);
    }
  }

  /**
   * Select the best encoding based on client preferences
   */
  private selectBestEncoding(acceptEncoding: string): CompressionEncoding | null {
    const acceptedEncodings = this.parseAcceptEncoding(acceptEncoding);
    
    // Prefer Brotli > Gzip > Deflate
    const preferenceOrder: CompressionEncoding[] = ['br', 'gzip', 'deflate'];
    
    for (const encoding of preferenceOrder) {
      if (
        this.config.supportedEncodings.includes(encoding) &&
        acceptedEncodings.has(encoding) &&
        acceptedEncodings.get(encoding)! > 0
      ) {
        return encoding;
      }
    }
    
    return null;
  }

  /**
   * Parse Accept-Encoding header
   */
  private parseAcceptEncoding(header: string): Map<string, number> {
    const encodings = new Map<string, number>();
    
    header.split(',').forEach(part => {
      const [encoding, qValue] = part.trim().split(';q=');
      const quality = qValue ? parseFloat(qValue) : 1.0;
      encodings.set(encoding.trim(), quality);
    });
    
    return encodings;
  }

  /**
   * Check if content type should be excluded from compression
   */
  private shouldExcludeContentType(contentType: string): boolean {
    return this.config.excludeContentTypes.some(excluded => 
      contentType.startsWith(excluded)
    );
  }

  /**
   * Update compression ratio statistics
   */
  private updateCompressionRatio(): void {
    if (this.stats.totalBytesOriginal > 0) {
      this.stats.avgCompressionRatio = 
        this.stats.totalBytesCompressed / this.stats.totalBytesOriginal;
    }
  }

  /**
   * Get compression statistics
   */
  getStats(): CompressionStats {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      totalRequests: 0,
      compressedResponses: 0,
      decompressedRequests: 0,
      totalBytesOriginal: 0,
      totalBytesCompressed: 0,
      avgCompressionRatio: 0,
    };
  }
}

// Create singleton instance
let compressionInstance: CompressionMiddleware | null = null;

/**
 * Get or create compression middleware instance
 */
export function getCompressionMiddleware(
  config?: Partial<CompressionConfig>
): CompressionMiddleware {
  if (!compressionInstance) {
    compressionInstance = new CompressionMiddleware(config);
  }
  return compressionInstance;
}

/**
 * Express-style middleware wrapper
 */
export function compressionMiddleware(
  config?: Partial<CompressionConfig>
) {
  const compression = getCompressionMiddleware(config);
  
  return async function(
    context: RequestContext,
    next: () => Promise<Response>
  ): Promise<Response> {
    // Process request decompression
    const processedReq = await compression.processRequest(context.req);
    context.req = processedReq;
    
    // Continue with next middleware
    const response = await next();
    
    // Process response compression
    return compression.processResponse(response, context.req);
  };
}

/**
 * Utility function to estimate compressed size without actually compressing
 */
export function estimateCompressedSize(
  data: string | ArrayBuffer,
  encoding: CompressionEncoding = 'gzip'
): number {
  const size = typeof data === 'string' 
    ? new TextEncoder().encode(data).length
    : data.byteLength;
  
  // Rough estimates based on typical compression ratios
  const ratios: Record<CompressionEncoding, number> = {
    'gzip': 0.3, // 70% reduction for text
    'deflate': 0.35,
    'br': 0.25, // Brotli typically achieves better compression
    'identity': 1.0,
  };
  
  return Math.ceil(size * ratios[encoding]);
}

/**
 * Check if compression would be beneficial
 */
export function shouldCompress(
  size: number,
  contentType: string,
  threshold: number = 1024
): boolean {
  // Don't compress small payloads
  if (size < threshold) return false;
  
  // Don't compress already compressed formats
  const compressedTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'video/',
    'audio/',
    'application/pdf',
    'application/zip',
    'application/gzip',
  ];
  
  return !compressedTypes.some(type => contentType.startsWith(type));
}