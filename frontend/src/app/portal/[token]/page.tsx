'use client';

import { use, useState, useEffect, useCallback } from 'react';
import { Shield, Lock, FileText, Edit, MessageSquare, CheckCircle, AlertCircle, LogOut } from 'lucide-react';
import { usePortal } from '@/hooks/usePortal';
import { DocumentViewer } from '@/components/portal/DocumentViewer';
import { SignatureCapture } from '@/components/portal/SignatureCapture';
import { RedlineEditor } from '@/components/portal/RedlineEditor';
import { NegotiationChat } from '@/components/portal/NegotiationChat';
import { cn } from '@/lib/utils';

// ============================================================================
// PORTAL PAGE
// ============================================================================

interface PortalPageProps {
  params: Promise<{ token: string }>;
}

export default function PortalPage({ params }: PortalPageProps) {
  const { token } = use(params);
  const {
    session,
    isLoading,
    error,
    requiresPin,
    validateToken,
    logout,
  } = usePortal();

  const [pin, setPin] = useState('');
  const [validating, setValidating] = useState(true);
  const [signatureComplete, setSignatureComplete] = useState(false);

  // Validate token on mount
  useEffect(() => {
    const validate = async () => {
      if (!session) {
        await validateToken(token);
      }
      setValidating(false);
    };
    validate();
  }, [token, session, validateToken]);

  // Handle PIN submission
  const handlePinSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setValidating(true);
    await validateToken(token, pin);
    setValidating(false);
  }, [token, pin, validateToken]);

  // Handle logout
  const handleLogout = useCallback(async () => {
    await logout();
    window.location.href = '/';
  }, [logout]);

  // Handle signature completion
  const handleSignatureComplete = useCallback(() => {
    setSignatureComplete(true);
  }, []);

  // Loading state
  if (validating || isLoading) {
    return (
      <PortalLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 border-2 border-purple-900 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="font-mono text-sm text-ghost-600">Validating access...</p>
        </div>
      </PortalLayout>
    );
  }

  // PIN required
  if (requiresPin) {
    return (
      <PortalLayout>
        <div className="max-w-md mx-auto mt-20">
          <div className="border border-ghost-300 bg-white p-8">
            <div className="flex items-center gap-3 mb-6">
              <Lock className="h-6 w-6 text-purple-900" />
              <h1 className="font-mono text-xl font-semibold text-purple-900">
                ACCESS CODE REQUIRED
              </h1>
            </div>
            <p className="font-mono text-sm text-ghost-600 mb-6">
              Enter the access code provided by the sender to continue.
            </p>
            <form onSubmit={handlePinSubmit}>
              <input
                type="text"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Enter access code"
                className="w-full px-4 py-3 font-mono text-sm border border-ghost-300 focus:border-purple-900 focus:outline-none mb-4"
                autoFocus
              />
              {error && (
                <p className="font-mono text-xs text-red-600 mb-4">{error}</p>
              )}
              <button
                type="submit"
                disabled={!pin || isLoading}
                className="w-full px-4 py-3 bg-purple-900 text-white font-mono text-sm hover:bg-purple-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'VALIDATING...' : 'CONTINUE'}
              </button>
            </form>
          </div>
        </div>
      </PortalLayout>
    );
  }

  // Error state
  if (error && !session) {
    return (
      <PortalLayout>
        <div className="max-w-md mx-auto mt-20">
          <div className="border border-red-300 bg-red-50 p-8">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="h-6 w-6 text-red-600" />
              <h1 className="font-mono text-xl font-semibold text-red-600">
                ACCESS DENIED
              </h1>
            </div>
            <p className="font-mono text-sm text-red-700">{error}</p>
            <p className="font-mono text-xs text-ghost-600 mt-4">
              This link may have expired or been revoked. Please contact the sender for a new link.
            </p>
          </div>
        </div>
      </PortalLayout>
    );
  }

  // Signature complete state
  if (signatureComplete) {
    return (
      <PortalLayout>
        <div className="max-w-md mx-auto mt-20">
          <div className="border border-green-300 bg-green-50 p-8 text-center">
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h1 className="font-mono text-xl font-semibold text-green-700 mb-2">
              SIGNATURE SUBMITTED
            </h1>
            <p className="font-mono text-sm text-green-700">
              Thank you! Your signature has been recorded successfully.
            </p>
            <p className="font-mono text-xs text-ghost-600 mt-4">
              You can now close this window.
            </p>
          </div>
        </div>
      </PortalLayout>
    );
  }

  // No session (should not happen)
  if (!session) {
    return (
      <PortalLayout>
        <div className="text-center mt-20">
          <p className="font-mono text-sm text-ghost-600">Invalid session</p>
        </div>
      </PortalLayout>
    );
  }

  // Render appropriate view based on token type
  return (
    <PortalLayout
      partyName={session.party_name}
      tokenType={session.token_type}
      onLogout={handleLogout}
    >
      {/* View Only */}
      {session.token_type === 'view' && (
        <DocumentViewer />
      )}

      {/* Sign */}
      {session.token_type === 'sign' && (
        <SignatureCapture onComplete={handleSignatureComplete} />
      )}

      {/* Redline */}
      {session.token_type === 'redline' && (
        <RedlineEditor />
      )}

      {/* Negotiate */}
      {session.token_type === 'negotiate' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RedlineEditor />
          <NegotiationChat />
        </div>
      )}

      {/* Full Access */}
      {session.token_type === 'full' && (
        <FullAccessPortal onSignatureComplete={handleSignatureComplete} />
      )}
    </PortalLayout>
  );
}

// ============================================================================
// FULL ACCESS PORTAL (Tabbed Interface)
// ============================================================================

function FullAccessPortal({ onSignatureComplete }: { onSignatureComplete: () => void }) {
  const [activeTab, setActiveTab] = useState<'document' | 'sign' | 'redline' | 'messages'>('document');

  const tabs = [
    { id: 'document' as const, label: 'Document', icon: FileText },
    { id: 'sign' as const, label: 'Sign', icon: Edit },
    { id: 'redline' as const, label: 'Redlines', icon: Edit },
    { id: 'messages' as const, label: 'Messages', icon: MessageSquare },
  ];

  return (
    <div>
      {/* Tabs */}
      <div className="flex border-b border-ghost-300 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-3 font-mono text-sm border-b-2 -mb-px transition-colors',
              activeTab === tab.id
                ? 'border-purple-900 text-purple-900'
                : 'border-transparent text-ghost-600 hover:text-purple-900'
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'document' && <DocumentViewer />}
      {activeTab === 'sign' && <SignatureCapture onComplete={onSignatureComplete} />}
      {activeTab === 'redline' && <RedlineEditor />}
      {activeTab === 'messages' && <NegotiationChat />}
    </div>
  );
}

// ============================================================================
// PORTAL LAYOUT
// ============================================================================

function PortalLayout({
  children,
  partyName,
  tokenType,
  onLogout,
}: {
  children: React.ReactNode;
  partyName?: string;
  tokenType?: string;
  onLogout?: () => void;
}) {
  const tokenLabel = {
    sign: 'Signature Request',
    view: 'Document View',
    redline: 'Redline Review',
    negotiate: 'Negotiation',
    full: 'Full Access',
  }[tokenType || ''] || 'Portal';

  return (
    <div className="min-h-screen bg-ghost-100">
      {/* Header */}
      <header className="bg-purple-900 text-white">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="h-6 w-6" />
              <div>
                <span className="font-mono text-lg font-semibold">PACTWISE</span>
                {tokenType && (
                  <span className="font-mono text-xs text-purple-300 ml-3">
                    {tokenLabel.toUpperCase()}
                  </span>
                )}
              </div>
            </div>
            {partyName && (
              <div className="flex items-center gap-4">
                <span className="font-mono text-sm text-purple-200">
                  {partyName}
                </span>
                {onLogout && (
                  <button
                    onClick={onLogout}
                    className="flex items-center gap-2 px-3 py-1.5 font-mono text-xs bg-purple-800 hover:bg-purple-700 rounded"
                  >
                    <LogOut className="h-3 w-3" />
                    EXIT
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-ghost-300 mt-auto">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between text-ghost-500 font-mono text-xs">
            <span>Secure Portal by Pactwise</span>
            <span>All actions are logged for audit purposes</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
