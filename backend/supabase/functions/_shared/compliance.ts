import { logSecurityEvent } from './security-monitoring.ts';

/**
 * Supported compliance frameworks
 */
export type ComplianceFramework = 'GDPR' | 'HIPAA' | 'CCPA' | 'SOC2' | 'ISO27001';

/**
 * Base interface for all compliance data
 */
export interface ComplianceData {
    [key: string]: unknown;
}

/**
 * GDPR-specific data structure
 */
export interface GDPRData extends ComplianceData {
    consent?: boolean;
    name?: string;
    email?: string;
    purpose?: string;
    dataRetentionPeriod?: number;
    rightsNotification?: boolean;
}

/**
 * HIPAA-specific data structure for PHI
 */
export interface HIPAAData extends ComplianceData {
    phi?: {
        isEncrypted: boolean;
        data?: string;
        accessLog?: Array<{
            userId: string;
            timestamp: string;
            action: string;
        }>;
        auditTrail?: boolean;
    };
    businessAssociateAgreement?: boolean;
    minimalNecessaryRule?: boolean;
}

/**
 * CCPA-specific data structure
 */
export interface CCPAData extends ComplianceData {
    doNotSell?: boolean;
    personalInformationCategories?: string[];
    disclosureToThirdParties?: boolean;
    consumerRightsNotice?: boolean;
}

/**
 * SOC2-specific data structure
 */
export interface SOC2Data extends ComplianceData {
    securityControls?: {
        accessControl: boolean;
        changeManagement: boolean;
        riskMitigation: boolean;
    };
    availabilityMetrics?: {
        uptime: number;
        targetUptime: number;
    };
    confidentialityProtections?: boolean;
}

/**
 * ISO27001-specific data structure
 */
export interface ISO27001Data extends ComplianceData {
    informationSecurityPolicy?: boolean;
    riskAssessment?: {
        completed: boolean;
        lastReviewDate?: string;
    };
    assetManagement?: boolean;
    incidentResponsePlan?: boolean;
}

/**
 * Generic compliance rule definition
 */
export interface ComplianceRule<T extends ComplianceData = ComplianceData> {
    description: string;
    check: (data: T) => boolean;
    severity?: 'low' | 'medium' | 'high' | 'critical';
    remediation?: string;
}

/**
 * Type-safe collection of compliance rules for each framework
 */
export interface ComplianceRuleSet<T extends ComplianceData = ComplianceData> {
    [ruleName: string]: ComplianceRule<T>;
}

/**
 * GDPR compliance rules
 */
const gdprRules: ComplianceRuleSet<GDPRData> = {
    dataProcessing: {
        description: 'Data processing must be lawful, fair, and transparent.',
        check: (data: GDPRData): boolean => {
            // In a real scenario, this would involve more complex checks
            return data.consent === true;
        },
        severity: 'high',
        remediation: 'Ensure user consent is obtained before processing personal data.',
    },
    dataMinimization: {
        description: 'Data collected must be adequate, relevant, and limited to what is necessary.',
        check: (data: GDPRData): boolean => {
            // Check if only necessary fields are present
            const allowedFields = ['name', 'email', 'consent', 'purpose', 'dataRetentionPeriod', 'rightsNotification'];
            return Object.keys(data).every(key => allowedFields.includes(key));
        },
        severity: 'medium',
        remediation: 'Remove unnecessary personal data fields from the request.',
    },
    rightsNotification: {
        description: 'Users must be notified of their data rights.',
        check: (data: GDPRData): boolean => {
            return data.rightsNotification === true;
        },
        severity: 'medium',
        remediation: 'Include notification of data subject rights (access, rectification, erasure, etc.).',
    },
};

/**
 * HIPAA compliance rules
 */
const hipaaRules: ComplianceRuleSet<HIPAAData> = {
    phiProtection: {
        description: 'Protected Health Information (PHI) must be encrypted.',
        check: (data: HIPAAData): boolean => {
            // Check if data contains PHI and if it is encrypted
            if (data.phi) {
                return data.phi.isEncrypted === true;
            }
            return true;
        },
        severity: 'critical',
        remediation: 'Encrypt all PHI data at rest and in transit.',
    },
    auditTrail: {
        description: 'PHI access must maintain an audit trail.',
        check: (data: HIPAAData): boolean => {
            if (data.phi && data.phi.data) {
                return data.phi.auditTrail === true;
            }
            return true;
        },
        severity: 'high',
        remediation: 'Implement audit logging for all PHI access.',
    },
    minimalNecessary: {
        description: 'Only the minimum necessary PHI should be accessed or disclosed.',
        check: (data: HIPAAData): boolean => {
            return data.minimalNecessaryRule !== false;
        },
        severity: 'medium',
        remediation: 'Ensure only minimum necessary PHI is included in the request.',
    },
};

/**
 * CCPA compliance rules
 */
const ccpaRules: ComplianceRuleSet<CCPAData> = {
    doNotSellRights: {
        description: 'Consumers must have the right to opt-out of data sales.',
        check: (data: CCPAData): boolean => {
            return data.doNotSell !== undefined;
        },
        severity: 'high',
        remediation: 'Implement "Do Not Sell My Personal Information" option.',
    },
    disclosureNotice: {
        description: 'Third-party data disclosures must be documented.',
        check: (data: CCPAData): boolean => {
            if (data.disclosureToThirdParties === true) {
                return data.personalInformationCategories !== undefined && data.personalInformationCategories.length > 0;
            }
            return true;
        },
        severity: 'medium',
        remediation: 'Disclose categories of personal information shared with third parties.',
    },
};

/**
 * SOC2 compliance rules
 */
const soc2Rules: ComplianceRuleSet<SOC2Data> = {
    securityControls: {
        description: 'Security controls must be implemented and operational.',
        check: (data: SOC2Data): boolean => {
            const controls = data.securityControls;
            return !!(controls?.accessControl && controls?.changeManagement && controls?.riskMitigation);
        },
        severity: 'critical',
        remediation: 'Implement all required security controls (access control, change management, risk mitigation).',
    },
    availability: {
        description: 'System availability must meet defined targets.',
        check: (data: SOC2Data): boolean => {
            const metrics = data.availabilityMetrics;
            if (!metrics) return false;
            return metrics.uptime >= metrics.targetUptime;
        },
        severity: 'high',
        remediation: 'Improve system uptime to meet availability targets.',
    },
};

/**
 * ISO27001 compliance rules
 */
const iso27001Rules: ComplianceRuleSet<ISO27001Data> = {
    securityPolicy: {
        description: 'Information security policy must be documented and approved.',
        check: (data: ISO27001Data): boolean => {
            return data.informationSecurityPolicy === true;
        },
        severity: 'critical',
        remediation: 'Document and approve information security policy.',
    },
    riskAssessment: {
        description: 'Regular risk assessments must be conducted.',
        check: (data: ISO27001Data): boolean => {
            return data.riskAssessment?.completed === true;
        },
        severity: 'high',
        remediation: 'Conduct and document regular information security risk assessments.',
    },
};

/**
 * Result of a compliance check
 */
export interface ComplianceResult {
    isCompliant: boolean;
    framework: ComplianceFramework;
    details: string[];
    violations: ComplianceViolation[];
    timestamp: string;
}

/**
 * Detailed compliance violation information
 */
export interface ComplianceViolation {
    ruleName: string;
    description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    remediation?: string;
}

/**
 * Context for compliance logging
 */
export interface ComplianceContext {
    user?: {
        id?: string;
        email?: string;
        enterprise_id?: string;
        role?: string;
    };
    request?: {
        url?: string;
        method?: string;
        headers?: Record<string, string>;
    };
    metadata?: Record<string, unknown>;
}

/**
 * Type guard to check if data conforms to GDPR structure
 */
export function isGDPRData(data: ComplianceData): data is GDPRData {
    return 'consent' in data || 'name' in data || 'email' in data;
}

/**
 * Type guard to check if data conforms to HIPAA structure
 */
export function isHIPAAData(data: ComplianceData): data is HIPAAData {
    return 'phi' in data;
}

/**
 * Type guard to check if data conforms to CCPA structure
 */
export function isCCPAData(data: ComplianceData): data is CCPAData {
    return 'doNotSell' in data || 'personalInformationCategories' in data;
}

/**
 * Type guard to check if data conforms to SOC2 structure
 */
export function isSOC2Data(data: ComplianceData): data is SOC2Data {
    return 'securityControls' in data || 'availabilityMetrics' in data;
}

/**
 * Type guard to check if data conforms to ISO27001 structure
 */
export function isISO27001Data(data: ComplianceData): data is ISO27001Data {
    return 'informationSecurityPolicy' in data || 'riskAssessment' in data;
}

/**
 * Get the appropriate rule set for a given framework
 */
function getRuleSet(framework: ComplianceFramework): ComplianceRuleSet {
    switch (framework) {
        case 'GDPR':
            return gdprRules;
        case 'HIPAA':
            return hipaaRules;
        case 'CCPA':
            return ccpaRules;
        case 'SOC2':
            return soc2Rules;
        case 'ISO27001':
            return iso27001Rules;
        default:
            throw new Error(`Unsupported compliance framework: ${framework}`);
    }
}

/**
 * Check compliance against a specific framework
 */
export function checkCompliance(
    data: ComplianceData,
    framework: ComplianceFramework
): ComplianceResult {
    const results: string[] = [];
    const violations: ComplianceViolation[] = [];
    let isCompliant = true;

    const rules = getRuleSet(framework);

    for (const ruleName in rules) {
        const rule = rules[ruleName];
        if (rule && !rule.check(data)) {
            isCompliant = false;
            const violationMessage = `Non-compliant with ${ruleName}: ${rule.description}`;
            results.push(violationMessage);
            violations.push({
                ruleName,
                description: rule.description,
                severity: rule.severity || 'medium',
                ...(rule.remediation ? { remediation: rule.remediation } : {}),
            });
        }
    }

    return {
        isCompliant,
        framework,
        details: results,
        violations,
        timestamp: new Date().toISOString(),
    };
}

/**
 * Check compliance against multiple frameworks
 */
export function checkMultipleFrameworks(
    data: ComplianceData,
    frameworks: ComplianceFramework[]
): ComplianceResult[] {
    return frameworks.map(framework => checkCompliance(data, framework));
}

/**
 * Log a compliance issue to the security monitoring system
 */
export async function logComplianceIssue(
    req: Request,
    result: ComplianceResult,
    context: ComplianceContext
): Promise<void> {
    await logSecurityEvent({
        event_type: 'compliance_violation',
        severity: getMaxSeverity(result.violations),
        title: `Compliance violation detected for ${result.framework}`,
        description: result.details.join(', '),
        source_ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
        user_agent: req.headers.get('user-agent') || 'unknown',
        ...(context.user?.id ? { user_id: context.user.id } : {}),
        ...(context.user?.enterprise_id ? { enterprise_id: context.user.enterprise_id } : {}),
        metadata: {
            request_url: req.url,
            request_method: req.method,
            framework: result.framework,
            violations: result.violations,
            timestamp: result.timestamp,
            ...context.metadata,
        },
    });
}

/**
 * Helper function to determine maximum severity from violations
 */
function getMaxSeverity(violations: ComplianceViolation[]): 'low' | 'medium' | 'high' | 'critical' {
    const severityLevels = { low: 1, medium: 2, high: 3, critical: 4 };
    let maxSeverity: 'low' | 'medium' | 'high' | 'critical' = 'low';
    let maxLevel = 0;

    for (const violation of violations) {
        const level = severityLevels[violation.severity];
        if (level > maxLevel) {
            maxLevel = level;
            maxSeverity = violation.severity;
        }
    }

    return maxSeverity;
}

/**
 * Validate and check compliance in a single operation
 */
export function validateCompliance<T extends ComplianceData>(
    data: T,
    framework: ComplianceFramework
): { valid: boolean; result: ComplianceResult } {
    const result = checkCompliance(data, framework);
    return {
        valid: result.isCompliant,
        result,
    };
}
