import { logSecurityEvent } from './security-monitoring.ts';

export interface Sla {
    name: string;
    target: number;
    threshold: number;
    unit: 'ms' | 'percent';
}

const slas: Sla[] = [
    {
        name: 'edge-function.duration',
        target: 500,
        threshold: 1000,
        unit: 'ms',
    },
    {
        name: 'edge-function.error-rate',
        target: 99.9,
        threshold: 99,
        unit: 'percent',
    },
];

export function checkSla(metricName: string, value: number) {
    const sla = slas.find(s => s.name === metricName);
    if (sla) {
        if (sla.unit === 'ms' && value > sla.threshold) {
            logSlaBreach(sla, value);
        } else if (sla.unit === 'percent' && value < sla.threshold) {
            logSlaBreach(sla, value);
        }
    }
}

async function logSlaBreach(sla: Sla, value: number) {
    await logSecurityEvent({
        event_type: 'sla_breach',
        severity: 'high',
        title: `SLA breach detected for ${sla.name}`,
        description: `Value of ${value}${sla.unit} breached threshold of ${sla.threshold}${sla.unit}`,
        source_ip: 'system',
        metadata: {
            sla,
            value,
        },
    });
}
