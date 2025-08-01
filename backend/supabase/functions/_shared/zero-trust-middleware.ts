
import { ZeroTrustEngine, TrustContext, AccessRequest, DeviceFingerprintGenerator } from './zero-trust.ts';
import { RequestContext } from './middleware.ts';
import { getCorsHeaders } from './cors.ts';

// Function to extract a device fingerprint from request headers
function getDeviceFingerprint(req: Request): string {
    const fingerprintHeader = req.headers.get('X-Device-Fingerprint');
    if (fingerprintHeader) {
        return fingerprintHeader;
    }

    // Fallback to generating a fingerprint from available data
    const userAgent = req.headers.get('user-agent') || 'unknown';
    
    // Create a device fingerprint from available headers
    const deviceFingerprint = {
        screen: {
            width: 1920,  // Default values since we can't get these from headers
            height: 1080,
            colorDepth: 24,
        },
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        language: req.headers.get('accept-language') || 'en-US',
        platform: 'unknown',
        userAgent,
        plugins: [],
        cookieEnabled: true,
        doNotTrack: false,
        touchSupport: false,
    };

    return DeviceFingerprintGenerator.generateFingerprint(deviceFingerprint);
}

export async function zeroTrustMiddleware(
    context: RequestContext,
    resource: string,
    action: string
): Promise<{ success: true; context: RequestContext } | { success: false; response: Response }> {
    const { req, user, isAuthenticated } = context;

    if (!isAuthenticated || !user) {
        // Allow unauthenticated users to proceed, but with a default low-trust context
        // This can be adjusted based on specific requirements for public endpoints
        return { success: true, context };
    }

    const ztEngine = new ZeroTrustEngine();
    const deviceFingerprint = getDeviceFingerprint(req);
    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    const trustContext: TrustContext = {
        userId: user.id,
        enterpriseId: user.enterprise_id || 'default',
        sessionId: req.headers.get('X-Session-Id') || 'unknown-session',
        deviceFingerprint,
        ipAddress,
        userAgent,
        riskScore: 0, // Will be calculated by the engine
        lastActivity: new Date(),
        authMethod: 'password', // This should be dynamically determined based on auth info
        deviceTrust: 'unknown',
        networkTrust: 'external',
        behaviorTrust: 'normal',
    };

    const accessRequest: AccessRequest = {
        resource,
        action,
        context: trustContext,
    };

    const accessResponse = await ztEngine.evaluateAccess(accessRequest);

    if (accessResponse.decision === 'deny') {
        return {
            success: false,
            response: new Response(JSON.stringify({ error: 'Access denied by security policy', reason: accessResponse.reason }), {
                headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
                status: 403,
            }),
        };
    }

    if (accessResponse.decision === 'challenge') {
        return {
            success: false,
            response: new Response(JSON.stringify({ error: 'Additional verification required', reason: accessResponse.reason }), {
                headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
                status: 401,
            }),
        };
    }

    // Add the access response to the context for downstream use
    context.accessResponse = accessResponse;

    return { success: true, context };
}
