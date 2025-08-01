import { describe, it, expect } from 'vitest';
import { getCorsHeaders, handleCors } from '@functions/_shared/cors';

describe('CORS Handling', () => {
  describe('getCorsHeaders', () => {
    it('should return secure CORS headers for valid origin', () => {
      const mockRequest = new Request('http://localhost:3000/test', {
        headers: {
          'origin': 'http://localhost:3000',
        },
      });

      const headers = getCorsHeaders(mockRequest);

      expect(headers['Access-Control-Allow-Origin']).toBeDefined();
      expect(headers['Access-Control-Allow-Methods']).toBe('GET, POST, PUT, DELETE, OPTIONS');
      expect(headers['Access-Control-Allow-Headers']).toContain('authorization');
      expect(headers['Access-Control-Allow-Headers']).toContain('content-type');
    });

    it('should handle missing origin header', () => {
      const mockRequest = new Request('http://localhost:3000/test');
      const headers = getCorsHeaders(mockRequest);

      expect(headers['Access-Control-Allow-Origin']).toBeDefined();
      expect(headers['Access-Control-Allow-Methods']).toBe('GET, POST, PUT, DELETE, OPTIONS');
    });

    it('should include credentials header', () => {
      const mockRequest = new Request('http://localhost:3000/test', {
        headers: {
          'origin': 'http://localhost:3000',
        },
      });

      const headers = getCorsHeaders(mockRequest);
      expect(headers['Access-Control-Allow-Credentials']).toBe('true');
    });
  });

  describe('handleCors', () => {
    it('should return OPTIONS response for preflight request', () => {
      const mockRequest = new Request('http://localhost:3000/test', {
        method: 'OPTIONS',
        headers: {
          'origin': 'http://localhost:3000',
        },
      });

      const response = handleCors(mockRequest);

      expect(response).toBeInstanceOf(Response);
      expect(response?.status).toBe(200);
    });

    it('should return null for non-OPTIONS request', () => {
      const mockRequest = new Request('http://localhost:3000/test', {
        method: 'GET',
        headers: {
          'origin': 'http://localhost:3000',
        },
      });

      const response = handleCors(mockRequest);
      expect(response).toBeNull();
    });
  });
});