import { logSecurityEvent } from './security-monitoring.ts';

// Basic SQL Injection patterns
const sqlInjectionPatterns = [
    /('|"|\-|\||\(|\=)+ (OR|AND) ('|"|\-|\||\(|\=)+/i,
    /('|") (UNION|SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE) /i,
    / (SLEEP|WAITFOR|BENCHMARK)\( *\d+ *\)/i,
];

// Basic XSS patterns
const xssPatterns = [
    /<script.*?>.*?<\/script>/i,
    /javascript:/i,
    /on\w+ *= *('|").*?('|")/i,
];

// Other suspicious patterns
const suspiciousPatterns = [
    /..\/..\//i, // Directory traversal
    /\x00/i, // Null byte injection
];

export interface ThreatDetectionResult {
    isThreat: boolean;
    threatType?: 'sql-injection' | 'xss' | 'suspicious-pattern';
    details?: string;
}

export function detectThreats(input: string): ThreatDetectionResult {
    for (const pattern of sqlInjectionPatterns) {
        if (pattern.test(input)) {
            return { isThreat: true, threatType: 'sql-injection', details: `Matched pattern: ${pattern.source}` };
        }
    }

    for (const pattern of xssPatterns) {
        if (pattern.test(input)) {
            return { isThreat: true, threatType: 'xss', details: `Matched pattern: ${pattern.source}` };
        }
    }

    for (const pattern of suspiciousPatterns) {
        if (pattern.test(input)) {
            return { isThreat: true, threatType: 'suspicious-pattern', details: `Matched pattern: ${pattern.source}` };
        }
    }

    return { isThreat: false };
}

export async function logThreat(req: Request, threatResult: ThreatDetectionResult, context: any) {
    await logSecurityEvent({
        event_type: 'threat_detected',
        severity: 'high',
        title: `Potential ${threatResult.threatType} attack detected`,
        description: threatResult.details || 'No additional details',
        source_ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
        user_agent: req.headers.get('user-agent') || 'unknown',
        user_id: context.user?.id,
        enterprise_id: context.user?.enterprise_id,
        metadata: {
            request_url: req.url,
            request_method: req.method,
            ...context,
        },
    });
}