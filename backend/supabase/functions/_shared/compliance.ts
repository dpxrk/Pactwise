import { logSecurityEvent } from './security-monitoring.ts';

// Mock compliance frameworks
const gdprRules = {
    dataProcessing: {
        description: 'Data processing must be lawful, fair, and transparent.',
        check: (data: any) => {
            // In a real scenario, this would involve more complex checks
            return data.consent === true;
        },
    },
    dataMinimization: {
        description: 'Data collected must be adequate, relevant, and limited to what is necessary.',
        check: (data: any) => {
            // Check if only necessary fields are present
            const allowedFields = ['name', 'email', 'consent'];
            return Object.keys(data).every(key => allowedFields.includes(key));
        },
    },
};

const hipaaRules = {
    phiProtection: {
        description: 'Protected Health Information (PHI) must be encrypted.',
        check: (data: any) => {
            // Check if data contains PHI and if it is encrypted
            if (data.phi) {
                return data.phi.isEncrypted === true;
            }
            return true;
        },
    },
};

export interface ComplianceResult {
    isCompliant: boolean;
    framework: 'GDPR' | 'HIPAA';
    details: string[];
}

export function checkCompliance(data: any, framework: 'GDPR' | 'HIPAA'): ComplianceResult {
    const results: string[] = [];
    let isCompliant = true;

    const rules = framework === 'GDPR' ? gdprRules : hipaaRules;

    for (const ruleName in rules) {
        const rule = rules[ruleName as keyof typeof rules] as { check: (data: any) => boolean; description: string };
        if (rule && !rule.check(data)) {
            isCompliant = false;
            results.push(`Non-compliant with ${ruleName}: ${rule.description}`);
        }
    }

    return { isCompliant, framework, details: results };
}

export async function logComplianceIssue(req: Request, result: ComplianceResult, context: any) {
    await logSecurityEvent({
        event_type: 'compliance_violation',
        severity: 'medium',
        title: `Compliance violation detected for ${result.framework}`,
        description: result.details.join(', '),
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
