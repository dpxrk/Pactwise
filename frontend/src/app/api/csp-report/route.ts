import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type');
    
    // CSP reports can come in different formats
    let report;
    if (contentType?.includes('application/csp-report')) {
      report = await request.json();
    } else if (contentType?.includes('application/reports+json')) {
      // Report-API format
      const reports = await request.json();
      report = reports[0];
    } else {
      report = await request.text();
    }

    // Log CSP violation
    logger.warn('CSP Violation Report', {
      report,
      userAgent: request.headers.get('user-agent'),
      referer: request.headers.get('referer'),
      ip: request.headers.get('x-forwarded-for') || 'unknown',
    });

    // In production, you might want to:
    // 1. Send to a monitoring service (Sentry, DataDog, etc.)
    // 2. Store in a database for analysis
    // 3. Send alerts for critical violations

    // Parse the violation details
    const cspReport = report['csp-report'] || report;
    const {
      'document-uri': documentUri,
      'violated-directive': violatedDirective,
      'effective-directive': effectiveDirective,
      'original-policy': originalPolicy,
      'blocked-uri': blockedUri,
      'source-file': sourceFile,
      'line-number': lineNumber,
      'column-number': columnNumber,
      'status-code': statusCode,
    } = cspReport || {};

    // Check for critical violations
    const criticalDirectives = ['script-src', 'object-src', 'base-uri'];
    const isCritical = criticalDirectives.some(
      directive => violatedDirective?.includes(directive) || effectiveDirective?.includes(directive)
    );

    if (isCritical) {
      logger.error('Critical CSP Violation', {
        documentUri,
        violatedDirective,
        blockedUri,
        sourceFile,
        lineNumber,
        columnNumber,
      });

      // You could send alerts here
      // await sendAlert('Critical CSP violation detected', { ... });
    }

    // Always return 204 No Content for CSP reports
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    logger.error('Error processing CSP report', { error });
    // Still return 204 to prevent retries
    return new NextResponse(null, { status: 204 });
  }
}