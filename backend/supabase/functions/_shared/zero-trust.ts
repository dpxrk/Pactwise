/**
 * Zero-Trust Architecture Implementation
 * Never trust, always verify - comprehensive security framework
 */

/// <reference path="../../types/global.d.ts" />

import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { logSecurityEvent } from './security-monitoring.ts';

// Zero-Trust Policy Engine Types
export interface TrustContext {
  userId: string;
  enterpriseId: string;
  sessionId: string;
  deviceFingerprint: string;
  ipAddress: string;
  userAgent: string;
  location?: GeoLocation;
  riskScore: number;
  lastActivity: Date;
  authMethod: 'password' | 'mfa' | 'sso' | 'api_key';
  deviceTrust: DeviceTrustLevel;
  networkTrust: NetworkTrustLevel;
  behaviorTrust: BehaviorTrustLevel;
}

export interface GeoLocation {
  country: string;
  region: string;
  city: string;
  latitude: number;
  longitude: number;
  accuracy: number;
}

export type DeviceTrustLevel = 'unknown' | 'untrusted' | 'low' | 'medium' | 'high' | 'trusted';
export type NetworkTrustLevel = 'untrusted' | 'external' | 'vpn' | 'corporate' | 'secure';
export type BehaviorTrustLevel = 'anomalous' | 'suspicious' | 'normal' | 'expected' | 'verified';
export type AccessDecision = 'deny' | 'challenge' | 'allow' | 'allow_monitored';

export interface PolicyRule {
  id: string;
  name: string;
  description: string;
  priority: number;
  enabled: boolean;
  conditions: PolicyCondition[];
  actions: PolicyAction[];
  created_at: string;
  updated_at: string;
}

export interface PolicyCondition {
  type: 'user_role' | 'risk_score' | 'device_trust' | 'network_trust' | 'behavior_trust' | 'time_window' | 'location' | 'resource_sensitivity';
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'in' | 'not_in' | 'contains';
  value: any;
  weight: number;
}

export interface PolicyAction {
  type: 'allow' | 'deny' | 'challenge' | 'require_mfa' | 'restrict_access' | 'monitor' | 'log_event';
  parameters?: Record<string, any>;
}

export interface AccessRequest {
  resource: string;
  action: string;
  context: TrustContext;
  metadata?: Record<string, any>;
}

export interface AccessResponse {
  decision: AccessDecision;
  reason: string;
  confidence: number;
  requiredActions: string[];
  expiresAt?: Date;
  restrictions?: AccessRestriction[];
  auditTrail: AuditEntry[];
}

export interface AccessRestriction {
  type: 'time_limit' | 'data_scope' | 'operation_limit' | 'approval_required';
  parameters: Record<string, any>;
}

// Database pattern types
interface UserBehaviorPattern {
  user_id: string;
  access_time: string;
  location_country?: string;
  location_city?: string;
  failed_attempts: number;
  created_at: string;
  ip_address: string;
  device_fingerprint: string;
  success: boolean;
  risk_score: number;
}

interface TrustedDevice {
  fingerprint: string;
  user_id: string;
  last_seen: string;
  trust_level: DeviceTrustLevel;
  access_count: number;
}

interface CorporateNetwork {
  enterprise_id: string;
  ip_range: string;
  trust_level: NetworkTrustLevel;
  name: string;
}

interface ZeroTrustSession {
  session_id: string;
  user_id: string;
  enterprise_id: string;
  device_fingerprint: string;
  ip_address: string;
  user_agent: string;
  trust_level: 'low' | 'medium' | 'high';
  risk_score: number;
  expires_at: string;
  created_at: string;
  last_activity: string;
  auth_method: TrustContext['authMethod'];
}

export interface AuditEntry {
  timestamp: Date;
  event: string;
  details: Record<string, any>;
}

// Device Fingerprinting Schema
const deviceFingerprintSchema = z.object({
  screen: z.object({
    width: z.number(),
    height: z.number(),
    colorDepth: z.number(),
  }),
  timezone: z.string(),
  language: z.string(),
  platform: z.string(),
  userAgent: z.string(),
  plugins: z.array(z.string()),
  canvas: z.string().optional(),
  webgl: z.string().optional(),
  fonts: z.array(z.string()).optional(),
  cookieEnabled: z.boolean(),
  doNotTrack: z.boolean(),
  touchSupport: z.boolean(),
});

export type DeviceFingerprint = z.infer<typeof deviceFingerprintSchema>;

/**
 * Zero-Trust Policy Engine
 * Evaluates every access request with continuous verification
 */
export class ZeroTrustEngine {
  private supabase: ReturnType<typeof createClient>;
  private policyCache: Map<string, PolicyRule[]> = new Map();
  private cacheExpiry: number = 5 * 60 * 1000; // 5 minutes

  constructor(supabaseUrl?: string, supabaseKey?: string) {
    this.supabase = createClient(
      supabaseUrl || Deno.env.get('SUPABASE_URL')!,
      supabaseKey || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
  }

  /**
   * Evaluate access request using zero-trust principles
   */
  async evaluateAccess(request: AccessRequest): Promise<AccessResponse> {
    const startTime = Date.now();
    const auditTrail: AuditEntry[] = [];

    try {
      // 1. Build comprehensive trust context
      const enrichedContext = await this.enrichTrustContext(request.context);
      auditTrail.push({
        timestamp: new Date(),
        event: 'context_enriched',
        details: { riskScore: enrichedContext.riskScore },
      });

      // 2. Get applicable policies
      const policies = await this.getApplicablePolicies(request, enrichedContext);
      auditTrail.push({
        timestamp: new Date(),
        event: 'policies_retrieved',
        details: { policyCount: policies.length },
      });

      // 3. Evaluate policies in priority order
      let finalDecision: AccessDecision = 'deny'; // Default deny
      let finalReason = 'Default deny policy';
      let confidence = 1.0;
      const requiredActions: string[] = [];
      const restrictions: AccessRestriction[] = [];

      for (const policy of policies.sort((a, b) => b.priority - a.priority)) {
        const policyResult = await this.evaluatePolicy(policy, request, enrichedContext);
        
        if (policyResult.applies) {
          auditTrail.push({
            timestamp: new Date(),
            event: 'policy_evaluated',
            details: { 
              policyId: policy.id, 
              decision: policyResult.decision,
              confidence: policyResult.confidence,
            },
          });

          // Policy with higher priority wins
          if (policyResult.decision !== 'deny' || finalDecision === 'deny') {
            finalDecision = policyResult.decision;
            finalReason = policyResult.reason;
            confidence = Math.min(confidence, policyResult.confidence);
            
            // Merge required actions and restrictions
            requiredActions.push(...policyResult.requiredActions);
            restrictions.push(...policyResult.restrictions);
          }
        }
      }

      // 4. Apply risk-based adjustments
      const riskAdjustment = this.applyRiskBasedAdjustments(
        finalDecision, 
        enrichedContext.riskScore,
        request
      );
      
      if (riskAdjustment.adjusted) {
        finalDecision = riskAdjustment.decision;
        finalReason = riskAdjustment.reason;
        confidence *= riskAdjustment.confidenceMultiplier;
        auditTrail.push({
          timestamp: new Date(),
          event: 'risk_adjustment_applied',
          details: riskAdjustment,
        });
      }

      // 5. Generate response
      const response: AccessResponse = {
        decision: finalDecision,
        reason: finalReason,
        confidence,
        requiredActions: [...new Set(requiredActions)],
        restrictions,
        auditTrail,
      };
      
      const expiry = this.calculateExpiry(finalDecision, enrichedContext);
      if (expiry) {
        response.expiresAt = expiry;
      }

      // 6. Log security event
      await this.logAccessDecision(request, response, enrichedContext);

      // 7. Update trust metrics
      await this.updateTrustMetrics(enrichedContext, finalDecision);

      return response;

    } catch (error) {
      // Security event for evaluation errors
      await logSecurityEvent({
        event_type: 'system_intrusion',
        severity: 'high',
        title: 'Zero-Trust Evaluation Error',
        description: `Failed to evaluate access request: ${error instanceof Error ? error.message : 'Unknown error'}`,
        source_ip: request.context.ipAddress,
        user_agent: request.context.userAgent,
        user_id: request.context.userId,
        enterprise_id: request.context.enterpriseId,
        metadata: {
          resource: request.resource,
          action: request.action,
          error: error instanceof Error ? error.message : String(error),
          evaluationTime: Date.now() - startTime,
        },
      });

      return {
        decision: 'deny',
        reason: 'Evaluation error - default deny',
        confidence: 1.0,
        requiredActions: ['contact_administrator'],
        auditTrail,
      };
    }
  }

  /**
   * Enrich trust context with additional security intelligence
   */
  private async enrichTrustContext(context: TrustContext): Promise<TrustContext> {
    // Get user behavior patterns
    const behaviorTrust = await this.evaluateBehaviorTrust(context);
    
    // Assess device trust level
    const deviceTrust = await this.evaluateDeviceTrust(context);
    
    // Determine network trust
    const networkTrust = await this.evaluateNetworkTrust(context);
    
    // Calculate composite risk score
    const riskScore = this.calculateRiskScore({
      ...context,
      behaviorTrust,
      deviceTrust,
      networkTrust,
    });

    return {
      ...context,
      behaviorTrust,
      deviceTrust,
      networkTrust,
      riskScore,
    };
  }

  /**
   * Evaluate user behavior patterns for anomalies
   */
  private async evaluateBehaviorTrust(context: TrustContext): Promise<BehaviorTrustLevel> {
    try {
      // Get user's historical patterns
      const { data: patterns } = await this.supabase
        .from('user_behavior_patterns')
        .select('*')
        .eq('user_id', context.userId)
        .eq('enterprise_id', context.enterpriseId)
        .order('created_at', { ascending: false })
        .limit(100) as { data: UserBehaviorPattern[] | null };

      if (!patterns || patterns.length === 0) {
        return 'normal'; // New user, no patterns yet
      }

      // Analyze current behavior against patterns
      const currentHour = new Date().getHours();
      const currentDay = new Date().getDay();
      
      // Check typical access times
      const typicalTimes = patterns.filter(p => 
        Math.abs(new Date(p.access_time).getHours() - currentHour) <= 2 &&
        new Date(p.access_time).getDay() === currentDay
      );

      // Check location patterns
      const typicalLocations = patterns.filter(p => 
        p.location_country === context.location?.country
      );

      // Calculate behavior score
      let behaviorScore = 0.5; // Neutral starting point
      
      if (typicalTimes.length > 5) behaviorScore += 0.2;
      if (typicalLocations.length > 10) behaviorScore += 0.2;
      if (context.authMethod === 'mfa') behaviorScore += 0.1;

      // Check for anomalies
      const recentFailures = patterns.filter(p => 
        p.failed_attempts > 0 && 
        new Date(p.created_at) > new Date(Date.now() - 24 * 60 * 60 * 1000)
      );

      if (recentFailures.length > 3) behaviorScore -= 0.3;
      if (context.location && !typicalLocations.length) behaviorScore -= 0.2;

      // Map score to trust level
      if (behaviorScore < 0.2) return 'anomalous';
      if (behaviorScore < 0.4) return 'suspicious';
      if (behaviorScore < 0.7) return 'normal';
      if (behaviorScore < 0.9) return 'expected';
      return 'verified';

    } catch (error) {
      console.warn('Behavior trust evaluation failed:', error);
      return 'normal';
    }
  }

  /**
   * Evaluate device trust based on fingerprinting and history
   */
  private async evaluateDeviceTrust(context: TrustContext): Promise<DeviceTrustLevel> {
    try {
      // Check if device is registered
      const { data: device } = await this.supabase
        .from('trusted_devices')
        .select('*')
        .eq('fingerprint', context.deviceFingerprint)
        .eq('user_id', context.userId)
        .single() as { data: TrustedDevice | null };

      if (device) {
        // Known device - check trust level and last seen
        const daysSinceLastSeen = Math.floor(
          (Date.now() - new Date(device.last_seen).getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysSinceLastSeen > 30) return 'low';
        if (device.trust_level === 'high' && daysSinceLastSeen <= 7) return 'trusted';
        return device.trust_level as DeviceTrustLevel;
      }

      // New device - analyze characteristics
      let trustScore = 0.3; // Start with low trust for unknown devices

      // Check user agent for suspicious patterns
      if (context.userAgent.includes('bot') || context.userAgent.includes('crawler')) {
        return 'untrusted';
      }

      // Check for automation indicators
      if (context.userAgent.includes('headless') || context.userAgent.includes('selenium')) {
        return 'untrusted';
      }

      // Basic trust for legitimate browsers
      const knownBrowsers = ['Chrome', 'Firefox', 'Safari', 'Edge'];
      if (knownBrowsers.some(browser => context.userAgent.includes(browser))) {
        trustScore += 0.2;
      }

      if (trustScore < 0.3) return 'unknown';
      if (trustScore < 0.5) return 'untrusted';
      if (trustScore < 0.7) return 'low';
      return 'medium';

    } catch (error) {
      console.warn('Device trust evaluation failed:', error);
      return 'unknown';
    }
  }

  /**
   * Evaluate network trust level
   */
  private async evaluateNetworkTrust(context: TrustContext): Promise<NetworkTrustLevel> {
    try {
      // Check against known corporate networks
      const { data: corporateNetworks } = await this.supabase
        .from('corporate_networks')
        .select('*')
        .eq('enterprise_id', context.enterpriseId) as { data: CorporateNetwork[] | null };

      if (corporateNetworks) {
        for (const network of corporateNetworks) {
          if (this.ipInRange(context.ipAddress, network.ip_range)) {
            return network.trust_level as NetworkTrustLevel;
          }
        }
      }

      // Check for VPN indicators
      if (await this.isVpnConnection(context.ipAddress)) {
        return 'vpn';
      }

      // Check for suspicious IPs
      if (await this.isSuspiciousIp(context.ipAddress)) {
        return 'untrusted';
      }

      // Default to external for unknown networks
      return 'external';

    } catch (error) {
      console.warn('Network trust evaluation failed:', error);
      return 'external';
    }
  }

  /**
   * Calculate composite risk score
   */
  private calculateRiskScore(context: TrustContext): number {
    let riskScore = 0.0;

    // Device trust impact
    const deviceRiskMap: Record<DeviceTrustLevel, number> = {
      unknown: 0.4,
      untrusted: 0.8,
      low: 0.3,
      medium: 0.2,
      high: 0.1,
      trusted: 0.05,
    };
    riskScore += deviceRiskMap[context.deviceTrust] * 0.3;

    // Network trust impact
    const networkRiskMap: Record<NetworkTrustLevel, number> = {
      untrusted: 0.9,
      external: 0.4,
      vpn: 0.2,
      corporate: 0.1,
      secure: 0.05,
    };
    riskScore += networkRiskMap[context.networkTrust] * 0.3;

    // Behavior trust impact
    const behaviorRiskMap: Record<BehaviorTrustLevel, number> = {
      anomalous: 0.9,
      suspicious: 0.6,
      normal: 0.3,
      expected: 0.1,
      verified: 0.05,
    };
    riskScore += behaviorRiskMap[context.behaviorTrust] * 0.4;

    return Math.min(1.0, riskScore);
  }

  /**
   * Get applicable policies for the request
   */
  private async getApplicablePolicies(_request: AccessRequest, context: TrustContext): Promise<PolicyRule[]> {
    const cacheKey = `policies:${context.enterpriseId}`;
    
    // Check cache first
    if (this.policyCache.has(cacheKey)) {
      const cached = this.policyCache.get(cacheKey)!;
      return cached.filter(policy => policy.enabled);
    }

    // Fetch from database
    const { data: policies } = await this.supabase
      .from('zero_trust_policies')
      .select('*')
      .eq('enterprise_id', context.enterpriseId)
      .eq('enabled', true)
      .order('priority', { ascending: false }) as { data: PolicyRule[] | null };

    if (policies) {
      this.policyCache.set(cacheKey, policies);
      // Clear cache after expiry
      setTimeout(() => this.policyCache.delete(cacheKey), this.cacheExpiry);
      return policies;
    }

    return [];
  }

  /**
   * Evaluate a single policy against the request
   */
  private async evaluatePolicy(
    policy: PolicyRule, 
    request: AccessRequest, 
    context: TrustContext
  ): Promise<{
    applies: boolean;
    decision: AccessDecision;
    reason: string;
    confidence: number;
    requiredActions: string[];
    restrictions: AccessRestriction[];
  }> {
    let conditionScore = 0;
    let totalWeight = 0;

    // Evaluate all conditions
    for (const condition of policy.conditions) {
      const conditionResult = this.evaluateCondition(condition, request, context);
      conditionScore += conditionResult.matches ? condition.weight : 0;
      totalWeight += condition.weight;
    }

    const confidence = totalWeight > 0 ? conditionScore / totalWeight : 0;
    const applies = confidence > 0.5; // Policy applies if more than 50% of conditions match

    if (!applies) {
      return {
        applies: false,
        decision: 'deny',
        reason: 'Policy conditions not met',
        confidence: 0,
        requiredActions: [],
        restrictions: [],
      };
    }

    // Determine action based on policy actions
    const primaryAction = policy.actions.find(a => ['allow', 'deny', 'challenge'].includes(a.type));
    const decision = (primaryAction?.type as AccessDecision) || 'deny';
    
    const requiredActions = policy.actions
      .filter(a => a.type === 'require_mfa' || a.type === 'monitor')
      .map(a => a.type);

    const restrictions: AccessRestriction[] = policy.actions
      .filter(a => a.type === 'restrict_access')
      .map(a => ({
        type: a.parameters?.restriction_type || 'time_limit',
        parameters: a.parameters || {},
      }));

    return {
      applies: true,
      decision,
      reason: `Policy ${policy.name} applied`,
      confidence,
      requiredActions,
      restrictions,
    };
  }

  /**
   * Evaluate a single policy condition
   */
  private evaluateCondition(
    condition: PolicyCondition, 
    _request: AccessRequest, 
    context: TrustContext
  ): { matches: boolean; value: any } {
    let contextValue: any;

    // Extract value based on condition type
    switch (condition.type) {
      case 'risk_score':
        contextValue = context.riskScore;
        break;
      case 'device_trust':
        const deviceTrustMap = { unknown: 0, untrusted: 1, low: 2, medium: 3, high: 4, trusted: 5 };
        contextValue = deviceTrustMap[context.deviceTrust];
        break;
      case 'network_trust':
        const networkTrustMap = { untrusted: 0, external: 1, vpn: 2, corporate: 3, secure: 4 };
        contextValue = networkTrustMap[context.networkTrust];
        break;
      case 'behavior_trust':
        const behaviorTrustMap = { anomalous: 0, suspicious: 1, normal: 2, expected: 3, verified: 4 };
        contextValue = behaviorTrustMap[context.behaviorTrust];
        break;
      case 'time_window':
        contextValue = new Date().getHours();
        break;
      case 'location':
        contextValue = context.location?.country;
        break;
      default:
        return { matches: false, value: null };
    }

    // Apply operator
    let matches = false;
    switch (condition.operator) {
      case 'equals':
        matches = contextValue === condition.value;
        break;
      case 'not_equals':
        matches = contextValue !== condition.value;
        break;
      case 'greater_than':
        matches = contextValue > condition.value;
        break;
      case 'less_than':
        matches = contextValue < condition.value;
        break;
      case 'in':
        matches = Array.isArray(condition.value) && condition.value.includes(contextValue);
        break;
      case 'not_in':
        matches = Array.isArray(condition.value) && !condition.value.includes(contextValue);
        break;
      case 'contains':
        matches = typeof contextValue === 'string' && contextValue.includes(condition.value);
        break;
    }

    return { matches, value: contextValue };
  }

  /**
   * Apply risk-based adjustments to the access decision
   */
  private applyRiskBasedAdjustments(
    decision: AccessDecision, 
    riskScore: number, 
    _request: AccessRequest
  ): {
    adjusted: boolean;
    decision: AccessDecision;
    reason: string;
    confidenceMultiplier: number;
  } {
    // High-risk scenarios require additional verification
    if (riskScore > 0.7 && decision === 'allow') {
      return {
        adjusted: true,
        decision: 'challenge',
        reason: 'High risk score requires additional verification',
        confidenceMultiplier: 0.8,
      };
    }

    // Medium-risk scenarios should be monitored
    if (riskScore > 0.4 && decision === 'allow') {
      return {
        adjusted: true,
        decision: 'allow_monitored',
        reason: 'Medium risk score - access allowed with monitoring',
        confidenceMultiplier: 0.9,
      };
    }

    return {
      adjusted: false,
      decision,
      reason: 'No risk-based adjustments needed',
      confidenceMultiplier: 1.0,
    };
  }

  /**
   * Calculate expiry time for access decisions
   */
  private calculateExpiry(decision: AccessDecision, context: TrustContext): Date | undefined {
    if (decision === 'deny') return undefined;

    const baseExpiry = 60 * 60 * 1000; // 1 hour base
    let expiryMs = baseExpiry;

    // Adjust based on risk and trust
    if (context.riskScore > 0.5) {
      expiryMs = Math.max(15 * 60 * 1000, baseExpiry * (1 - context.riskScore)); // Max 15 min for high risk
    }

    if (context.deviceTrust === 'trusted' && context.networkTrust === 'corporate') {
      expiryMs *= 2; // Longer for trusted devices on corporate network
    }

    return new Date(Date.now() + expiryMs);
  }

  /**
   * Log access decision for audit and analysis
   */
  private async logAccessDecision(
    request: AccessRequest, 
    response: AccessResponse, 
    context: TrustContext
  ): Promise<void> {
    try {
      await this.supabase
        .from('zero_trust_audit_log')
        .insert({
          user_id: context.userId,
          enterprise_id: context.enterpriseId,
          session_id: context.sessionId,
          resource: request.resource,
          action: request.action,
          decision: response.decision,
          reason: response.reason,
          confidence: response.confidence,
          risk_score: context.riskScore,
          device_trust: context.deviceTrust,
          network_trust: context.networkTrust,
          behavior_trust: context.behaviorTrust,
          source_ip: context.ipAddress,
          user_agent: context.userAgent,
          location: context.location,
          audit_trail: response.auditTrail,
          metadata: {
            requiredActions: response.requiredActions,
            restrictions: response.restrictions,
            ...request.metadata,
          },
        });
    } catch (error) {
      console.warn('Failed to log access decision:', error);
    }
  }

  /**
   * Update trust metrics based on access outcomes
   */
  private async updateTrustMetrics(context: TrustContext, decision: AccessDecision): Promise<void> {
    // Update device trust if access was successful
    if (decision === 'allow' || decision === 'allow_monitored') {
      await this.supabase
        .from('trusted_devices')
        .upsert({
          fingerprint: context.deviceFingerprint,
          user_id: context.userId,
          enterprise_id: context.enterpriseId,
          last_seen: new Date().toISOString(),
          trust_level: this.adjustDeviceTrust(context.deviceTrust, 'positive'),
          access_count: 1, // Will be incremented by database trigger
        }, {
          onConflict: 'fingerprint,user_id',
        });
    }

    // Update behavior patterns
    await this.supabase
      .from('user_behavior_patterns')
      .insert({
        user_id: context.userId,
        enterprise_id: context.enterpriseId,
        access_time: new Date().toISOString(),
        ip_address: context.ipAddress,
        location_country: context.location?.country,
        location_city: context.location?.city,
        device_fingerprint: context.deviceFingerprint,
        success: decision !== 'deny',
        failed_attempts: decision === 'deny' ? 1 : 0,
        risk_score: context.riskScore,
      });
  }

  /**
   * Adjust device trust level based on behavior
   */
  private adjustDeviceTrust(current: DeviceTrustLevel, adjustment: 'positive' | 'negative'): DeviceTrustLevel {
    const levels: DeviceTrustLevel[] = ['unknown', 'untrusted', 'low', 'medium', 'high', 'trusted'];
    const currentIndex = levels.indexOf(current);
    
    if (adjustment === 'positive' && currentIndex < levels.length - 1) {
      return levels[currentIndex + 1];
    } else if (adjustment === 'negative' && currentIndex > 0) {
      return levels[currentIndex - 1];
    }
    
    return current;
  }

  /**
   * Helper methods for network analysis
   */
  private ipInRange(ip: string, range: string): boolean {
    // Simple CIDR check - in production, use proper IP library
    const [rangeIp, mask] = range.split('/');
    if (!mask) return ip === rangeIp;
    
    // Basic implementation - for production use proper CIDR calculation
    return ip.startsWith(rangeIp.split('.').slice(0, parseInt(mask) / 8).join('.'));
  }

  private async isVpnConnection(_ip: string): Promise<boolean> {
    // In production, integrate with VPN detection service
    // For now, simple heuristics
    return false;
  }

  private async isSuspiciousIp(ip: string): Promise<boolean> {
    // In production, check against threat intelligence feeds
    // For now, basic checks
    const suspiciousRanges = ['127.0.0.1', '0.0.0.0'];
    return suspiciousRanges.some(range => ip.startsWith(range));
  }
}

/**
 * Device Fingerprinting Utilities
 */
export class DeviceFingerprintGenerator {
  /**
   * Generate device fingerprint from client data
   */
  static generateFingerprint(deviceData: DeviceFingerprint): string {
    const components = [
      deviceData.screen.width,
      deviceData.screen.height,
      deviceData.screen.colorDepth,
      deviceData.timezone,
      deviceData.language,
      deviceData.platform,
      deviceData.userAgent,
      deviceData.plugins.sort().join(','),
      deviceData.canvas || '',
      deviceData.webgl || '',
      deviceData.fonts?.sort().join(',') || '',
      deviceData.cookieEnabled.toString(),
      deviceData.doNotTrack.toString(),
      deviceData.touchSupport.toString(),
    ];

    // Create hash of components
    const hash = this.simpleHash(components.join('|'));
    return hash;
  }

  /**
   * Simple hash function for fingerprinting
   */
  private static simpleHash(str: string): string {
    let hash = 0;
    if (str.length === 0) return hash.toString();
    
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    
    return Math.abs(hash).toString(16);
  }

  /**
   * Validate device fingerprint data
   */
  static validateFingerprint(data: any): DeviceFingerprint | null {
    try {
      return deviceFingerprintSchema.parse(data);
    } catch {
      return null;
    }
  }
}

/**
 * Zero-Trust Session Manager
 */
export class ZeroTrustSessionManager {
  private supabase: ReturnType<typeof createClient>;
  private engine: ZeroTrustEngine;

  constructor(supabaseUrl?: string, supabaseKey?: string) {
    this.supabase = createClient(
      supabaseUrl || Deno.env.get('SUPABASE_URL')!,
      supabaseKey || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    this.engine = new ZeroTrustEngine(supabaseUrl, supabaseKey);
  }

  /**
   * Create authenticated session with continuous verification
   */
  async createSession(
    userId: string,
    enterpriseId: string,
    deviceFingerprint: string,
    ipAddress: string,
    userAgent: string,
    authMethod: TrustContext['authMethod']
  ): Promise<{
    sessionId: string;
    expiresAt: Date;
    trustLevel: 'low' | 'medium' | 'high';
    restrictions: AccessRestriction[];
  }> {
    const sessionId = `zts_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Build initial trust context
    const context: TrustContext = {
      userId,
      enterpriseId,
      sessionId,
      deviceFingerprint,
      ipAddress,
      userAgent,
      riskScore: 0.5, // Will be calculated
      lastActivity: new Date(),
      authMethod,
      deviceTrust: 'unknown',
      networkTrust: 'external',
      behaviorTrust: 'normal',
    };

    // Evaluate initial trust
    const accessResponse = await this.engine.evaluateAccess({
      resource: 'session',
      action: 'create',
      context,
    });

    if (accessResponse.decision === 'deny') {
      throw new Error(`Session creation denied: ${accessResponse.reason}`);
    }

    // Determine trust level and expiry
    let trustLevel: 'low' | 'medium' | 'high' = 'low';
    let sessionDuration = 15 * 60 * 1000; // 15 minutes default

    if (context.riskScore < 0.3) {
      trustLevel = 'high';
      sessionDuration = 4 * 60 * 60 * 1000; // 4 hours
    } else if (context.riskScore < 0.5) {
      trustLevel = 'medium';
      sessionDuration = 60 * 60 * 1000; // 1 hour
    }

    const expiresAt = new Date(Date.now() + sessionDuration);

    // Store session
    await this.supabase
      .from('zero_trust_sessions')
      .insert({
        session_id: sessionId,
        user_id: userId,
        enterprise_id: enterpriseId,
        device_fingerprint: deviceFingerprint,
        ip_address: ipAddress,
        user_agent: userAgent,
        trust_level: trustLevel,
        risk_score: context.riskScore,
        expires_at: expiresAt.toISOString(),
        created_at: new Date().toISOString(),
        last_activity: new Date().toISOString(),
        auth_method: authMethod,
      });

    return {
      sessionId,
      expiresAt,
      trustLevel,
      restrictions: accessResponse.restrictions || [],
    };
  }

  /**
   * Validate and refresh session with continuous verification
   */
  async validateSession(sessionId: string): Promise<{
    valid: boolean;
    context?: TrustContext;
    requiresReauth?: boolean;
    reason?: string;
  }> {
    // Get session from database
    const { data: session } = await this.supabase
      .from('zero_trust_sessions')
      .select('*')
      .eq('session_id', sessionId)
      .single() as { data: ZeroTrustSession | null };

    if (!session) {
      return { valid: false, reason: 'Session not found' };
    }

    // Check expiry
    if (new Date() > new Date(session.expires_at)) {
      return { valid: false, reason: 'Session expired' };
    }

    // Build current context
    const context: TrustContext = {
      userId: session.user_id,
      enterpriseId: session.enterprise_id,
      sessionId: session.session_id,
      deviceFingerprint: session.device_fingerprint,
      ipAddress: session.ip_address,
      userAgent: session.user_agent,
      riskScore: session.risk_score,
      lastActivity: new Date(session.last_activity),
      authMethod: session.auth_method,
      deviceTrust: 'medium', // Will be re-evaluated
      networkTrust: 'external',
      behaviorTrust: 'normal',
    };

    // Re-evaluate trust for session validation
    const accessResponse = await this.engine.evaluateAccess({
      resource: 'session',
      action: 'validate',
      context,
    });

    if (accessResponse.decision === 'deny') {
      return { 
        valid: false, 
        reason: `Session validation failed: ${accessResponse.reason}` 
      };
    }

    if (accessResponse.decision === 'challenge') {
      return { 
        valid: false, 
        requiresReauth: true, 
        reason: 'Additional authentication required' 
      };
    }

    // Update last activity
    await this.supabase
      .from('zero_trust_sessions')
      .update({ 
        last_activity: new Date().toISOString(),
        risk_score: context.riskScore,
      })
      .eq('session_id', sessionId);

    return { valid: true, context };
  }

  /**
   * Terminate session
   */
  async terminateSession(sessionId: string): Promise<void> {
    await this.supabase
      .from('zero_trust_sessions')
      .delete()
      .eq('session_id', sessionId);
  }
}