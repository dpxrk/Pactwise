import { logSecurityEvent } from './security-monitoring.ts';

/**
 * Threat pattern type definition
 */
export type ThreatPatternType = 'sql-injection' | 'xss' | 'suspicious-pattern';

/**
 * Individual threat pattern definition
 */
export interface ThreatPattern {
  readonly pattern: RegExp;
  readonly type: ThreatPatternType;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
  readonly description: string;
}

/**
 * Threat detection context from request/user
 */
export interface ThreatDetectionContext {
  user?: {
    id: string;
    enterprise_id: string;
    email?: string;
    role?: string;
  } | null;
  endpoint?: string;
  method?: string;
  headers?: Record<string, string>;
  body?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

/**
 * Result of threat detection analysis
 */
export interface ThreatDetectionResult {
  isThreat: boolean;
  threatType?: ThreatPatternType;
  details?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  matchedPattern?: string;
}

/**
 * Threat analysis indicators for risk scoring
 */
export interface ThreatIndicators {
  sqlInjectionScore: number;
  xssScore: number;
  pathTraversalScore: number;
  commandInjectionScore: number;
  overallRiskScore: number;
  detectedPatterns: Array<{
    type: ThreatPatternType;
    pattern: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
  }>;
}

// SQL Injection threat patterns with metadata
const sqlInjectionPatterns: ReadonlyArray<ThreatPattern> = [
  {
    pattern: /('|"|\-|\||\(|\=)+ (OR|AND) ('|"|\-|\||\(|\=)+/i,
    type: 'sql-injection',
    severity: 'high',
    description: 'Boolean-based SQL injection attempt',
  },
  {
    pattern: /('|") (UNION|SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE) /i,
    type: 'sql-injection',
    severity: 'critical',
    description: 'SQL command injection attempt',
  },
  {
    pattern: / (SLEEP|WAITFOR|BENCHMARK)\( *\d+ *\)/i,
    type: 'sql-injection',
    severity: 'high',
    description: 'Time-based blind SQL injection attempt',
  },
];

// XSS threat patterns with metadata
const xssPatterns: ReadonlyArray<ThreatPattern> = [
  {
    pattern: /<script.*?>.*?<\/script>/i,
    type: 'xss',
    severity: 'high',
    description: 'Script tag injection attempt',
  },
  {
    pattern: /javascript:/i,
    type: 'xss',
    severity: 'medium',
    description: 'JavaScript protocol injection attempt',
  },
  {
    pattern: /on\w+ *= *('|").*?('|")/i,
    type: 'xss',
    severity: 'high',
    description: 'Event handler injection attempt',
  },
];

// Suspicious patterns with metadata
const suspiciousPatterns: ReadonlyArray<ThreatPattern> = [
  {
    pattern: /..\/..\//i,
    type: 'suspicious-pattern',
    severity: 'high',
    description: 'Directory traversal attempt',
  },
  {
    pattern: /\x00/i,
    type: 'suspicious-pattern',
    severity: 'medium',
    description: 'Null byte injection attempt',
  },
];

/**
 * Detect threats in a given input string
 * @param input - The string to analyze for threats
 * @returns Threat detection result with details if threat is found
 */
export function detectThreats(input: string): ThreatDetectionResult {
  // Check SQL injection patterns
  for (const threatPattern of sqlInjectionPatterns) {
    if (threatPattern.pattern.test(input)) {
      return {
        isThreat: true,
        threatType: threatPattern.type,
        details: `${threatPattern.description}: ${threatPattern.pattern.source}`,
        severity: threatPattern.severity,
        matchedPattern: threatPattern.pattern.source,
      };
    }
  }

  // Check XSS patterns
  for (const threatPattern of xssPatterns) {
    if (threatPattern.pattern.test(input)) {
      return {
        isThreat: true,
        threatType: threatPattern.type,
        details: `${threatPattern.description}: ${threatPattern.pattern.source}`,
        severity: threatPattern.severity,
        matchedPattern: threatPattern.pattern.source,
      };
    }
  }

  // Check suspicious patterns
  for (const threatPattern of suspiciousPatterns) {
    if (threatPattern.pattern.test(input)) {
      return {
        isThreat: true,
        threatType: threatPattern.type,
        details: `${threatPattern.description}: ${threatPattern.pattern.source}`,
        severity: threatPattern.severity,
        matchedPattern: threatPattern.pattern.source,
      };
    }
  }

  return { isThreat: false };
}

/**
 * Perform comprehensive threat analysis with risk scoring
 * @param input - The string to analyze
 * @returns Detailed threat indicators with risk scores
 */
export function analyzeThreatIndicators(input: string): ThreatIndicators {
  const detectedPatterns: Array<{
    type: ThreatPatternType;
    pattern: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
  }> = [];

  let sqlInjectionScore = 0;
  let xssScore = 0;
  let pathTraversalScore = 0;
  let commandInjectionScore = 0;

  // Severity scoring weights
  const severityWeights: Record<'low' | 'medium' | 'high' | 'critical', number> = {
    low: 1,
    medium: 2,
    high: 3,
    critical: 4,
  };

  // Check SQL injection patterns
  for (const threatPattern of sqlInjectionPatterns) {
    if (threatPattern.pattern.test(input)) {
      sqlInjectionScore += severityWeights[threatPattern.severity];
      detectedPatterns.push({
        type: threatPattern.type,
        pattern: threatPattern.pattern.source,
        severity: threatPattern.severity,
      });
    }
  }

  // Check XSS patterns
  for (const threatPattern of xssPatterns) {
    if (threatPattern.pattern.test(input)) {
      xssScore += severityWeights[threatPattern.severity];
      detectedPatterns.push({
        type: threatPattern.type,
        pattern: threatPattern.pattern.source,
        severity: threatPattern.severity,
      });
    }
  }

  // Check suspicious patterns (path traversal, command injection)
  for (const threatPattern of suspiciousPatterns) {
    if (threatPattern.pattern.test(input)) {
      if (threatPattern.description.includes('traversal')) {
        pathTraversalScore += severityWeights[threatPattern.severity];
      } else {
        commandInjectionScore += severityWeights[threatPattern.severity];
      }
      detectedPatterns.push({
        type: threatPattern.type,
        pattern: threatPattern.pattern.source,
        severity: threatPattern.severity,
      });
    }
  }

  // Calculate overall risk score (0-100 scale)
  const totalScore = sqlInjectionScore + xssScore + pathTraversalScore + commandInjectionScore;
  const maxPossibleScore = 16; // 4 critical threats max
  const overallRiskScore = Math.min(100, Math.round((totalScore / maxPossibleScore) * 100));

  return {
    sqlInjectionScore,
    xssScore,
    pathTraversalScore,
    commandInjectionScore,
    overallRiskScore,
    detectedPatterns,
  };
}

/**
 * Log a detected threat to security monitoring system
 * @param req - The HTTP request containing threat
 * @param threatResult - The threat detection result
 * @param context - Additional context about the request/user
 */
export async function logThreat(
  req: Request,
  threatResult: ThreatDetectionResult,
  context: ThreatDetectionContext
): Promise<void> {
  // Determine severity from threat result or default to high
  const severity = threatResult.severity || 'high';

  await logSecurityEvent({
    event_type: 'threat_detected',
    severity,
    title: `Potential ${threatResult.threatType || 'security'} attack detected`,
    description: threatResult.details || 'No additional details',
    source_ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
    user_agent: req.headers.get('user-agent') || 'unknown',
    ...(context.user?.id ? { user_id: context.user.id } : {}),
    ...(context.user?.enterprise_id ? { enterprise_id: context.user.enterprise_id } : {}),
    ...(context.endpoint ? { endpoint: context.endpoint } : {}),
    metadata: {
      request_url: req.url,
      request_method: req.method,
      threat_type: threatResult.threatType,
      matched_pattern: threatResult.matchedPattern,
      severity: threatResult.severity,
      ...context.metadata,
    },
  });
}