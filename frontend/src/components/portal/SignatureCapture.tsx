'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  PenTool,
  Type,
  Upload,
  RotateCcw,
  Check,
  X,
  AlertCircle,
  FileText,
  Clock,
} from 'lucide-react';
import SignaturePad from 'signature_pad';
import { usePortal } from '@/hooks/usePortal';
import type { SignatureRequest } from '@/types/portal.types';
import { cn } from '@/lib/utils';

// ============================================================================
// SIGNATURE CAPTURE
// ============================================================================

interface SignatureCaptureProps {
  onComplete: () => void;
}

type SignatureMode = 'draw' | 'type' | 'upload';

const SIGNATURE_FONTS = [
  { name: 'Dancing Script', label: 'Script' },
  { name: 'Great Vibes', label: 'Elegant' },
  { name: 'Pacifico', label: 'Casual' },
  { name: 'Caveat', label: 'Handwritten' },
];

const CONSENT_TEXT = `By signing this document, I acknowledge that I have read and understand its contents. I agree that my electronic signature is the legal equivalent of my manual signature on this document.`;

export function SignatureCapture({ onComplete }: SignatureCaptureProps) {
  const { getSignatureRequest, submitSignature, declineSignature, isLoading, error } = usePortal();

  const [request, setRequest] = useState<SignatureRequest | null>(null);
  const [mode, setMode] = useState<SignatureMode>('draw');
  const [typedName, setTypedName] = useState('');
  const [selectedFont, setSelectedFont] = useState(SIGNATURE_FONTS[0].name);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [hasSignature, setHasSignature] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);
  const [showDeclineDialog, setShowDeclineDialog] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const signaturePadRef = useRef<SignaturePad | null>(null);

  // Load signature request
  useEffect(() => {
    const load = async () => {
      const req = await getSignatureRequest();
      setRequest(req);
    };
    load();
  }, [getSignatureRequest]);

  // Initialize SignaturePad
  useEffect(() => {
    if (canvasRef.current && mode === 'draw') {
      const canvas = canvasRef.current;
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      canvas.width = canvas.offsetWidth * ratio;
      canvas.height = canvas.offsetHeight * ratio;
      canvas.getContext('2d')?.scale(ratio, ratio);

      signaturePadRef.current = new SignaturePad(canvas, {
        backgroundColor: 'rgb(255, 255, 255)',
        penColor: 'rgb(0, 0, 0)',
      });

      signaturePadRef.current.addEventListener('endStroke', () => {
        setHasSignature(!signaturePadRef.current?.isEmpty());
      });
    }

    return () => {
      signaturePadRef.current?.off();
    };
  }, [mode]);

  // Clear signature
  const handleClear = useCallback(() => {
    if (mode === 'draw' && signaturePadRef.current) {
      signaturePadRef.current.clear();
      setHasSignature(false);
    } else if (mode === 'type') {
      setTypedName('');
      setHasSignature(false);
    } else if (mode === 'upload') {
      setUploadedImage(null);
      setHasSignature(false);
    }
  }, [mode]);

  // Handle file upload
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setUploadedImage(event.target?.result as string);
        setHasSignature(true);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  // Get signature data based on mode
  const getSignatureData = useCallback((): string => {
    if (mode === 'draw' && signaturePadRef.current) {
      return signaturePadRef.current.toDataURL('image/png');
    } else if (mode === 'type') {
      // Create canvas with typed text
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 150;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.font = `48px "${selectedFont}", cursive`;
        ctx.fillStyle = 'black';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(typedName, canvas.width / 2, canvas.height / 2);
      }
      return canvas.toDataURL('image/png');
    } else if (mode === 'upload' && uploadedImage) {
      return uploadedImage;
    }
    return '';
  }, [mode, selectedFont, typedName, uploadedImage]);

  // Submit signature
  const handleSubmit = useCallback(async () => {
    if (!hasSignature || !consentChecked) return;

    setSubmitting(true);
    const signatureData = getSignatureData();

    const success = await submitSignature({
      signature_type: mode === 'draw' ? 'drawn' : mode === 'type' ? 'typed' : 'uploaded',
      signature_data: signatureData,
      consent_text: CONSENT_TEXT,
      font_family: mode === 'type' ? selectedFont : undefined,
      canvas_width: mode === 'draw' ? canvasRef.current?.width : undefined,
      canvas_height: mode === 'draw' ? canvasRef.current?.height : undefined,
    });

    setSubmitting(false);
    if (success) {
      onComplete();
    }
  }, [hasSignature, consentChecked, getSignatureData, mode, selectedFont, submitSignature, onComplete]);

  // Decline to sign
  const handleDecline = useCallback(async () => {
    setSubmitting(true);
    const success = await declineSignature(declineReason || undefined);
    setSubmitting(false);
    if (success) {
      setShowDeclineDialog(false);
    }
  }, [declineReason, declineSignature]);

  // Update hasSignature for typed mode
  useEffect(() => {
    if (mode === 'type') {
      setHasSignature(typedName.length >= 2);
    }
  }, [mode, typedName]);

  if (isLoading && !request) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-purple-900 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="font-mono text-sm text-ghost-600">Loading signature request...</p>
      </div>
    );
  }

  if (error && !request) {
    return (
      <div className="border border-red-300 bg-red-50 p-6">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <p className="font-mono text-sm text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Request Info */}
      {request && (
        <div className="border border-ghost-300 bg-white p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="font-mono text-lg font-semibold text-purple-900">
                {request.title}
              </h2>
              {request.description && (
                <p className="font-mono text-sm text-ghost-600 mt-1">
                  {request.description}
                </p>
              )}
            </div>
            {request.expires_at && (
              <div className="flex items-center gap-2 text-amber-600">
                <Clock className="h-4 w-4" />
                <span className="font-mono text-xs">
                  Expires: {new Date(request.expires_at).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>

          {/* Documents to sign */}
          {request.documents && request.documents.length > 0 && (
            <div className="border-t border-ghost-200 pt-4">
              <p className="font-mono text-xs text-ghost-500 uppercase mb-2">Documents</p>
              <div className="space-y-2">
                {request.documents.map((doc) => (
                  <div key={doc.id} className="flex items-center gap-2 text-ghost-700">
                    <FileText className="h-4 w-4" />
                    <span className="font-mono text-sm">{doc.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Signature Area */}
      <div className="border border-ghost-300 bg-white">
        {/* Mode Tabs */}
        <div className="flex border-b border-ghost-300">
          <button
            onClick={() => { setMode('draw'); handleClear(); }}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 px-4 py-3 font-mono text-sm border-b-2 -mb-px transition-colors',
              mode === 'draw'
                ? 'border-purple-900 text-purple-900 bg-purple-50'
                : 'border-transparent text-ghost-600 hover:text-purple-900'
            )}
          >
            <PenTool className="h-4 w-4" />
            Draw
          </button>
          <button
            onClick={() => { setMode('type'); handleClear(); }}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 px-4 py-3 font-mono text-sm border-b-2 -mb-px transition-colors',
              mode === 'type'
                ? 'border-purple-900 text-purple-900 bg-purple-50'
                : 'border-transparent text-ghost-600 hover:text-purple-900'
            )}
          >
            <Type className="h-4 w-4" />
            Type
          </button>
          <button
            onClick={() => { setMode('upload'); handleClear(); }}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 px-4 py-3 font-mono text-sm border-b-2 -mb-px transition-colors',
              mode === 'upload'
                ? 'border-purple-900 text-purple-900 bg-purple-50'
                : 'border-transparent text-ghost-600 hover:text-purple-900'
            )}
          >
            <Upload className="h-4 w-4" />
            Upload
          </button>
        </div>

        {/* Signature Input */}
        <div className="p-6">
          {mode === 'draw' && (
            <div>
              <p className="font-mono text-xs text-ghost-500 mb-3">
                Draw your signature in the box below
              </p>
              <div className="border-2 border-dashed border-ghost-300 rounded bg-white">
                <canvas
                  ref={canvasRef}
                  className="w-full h-40 cursor-crosshair"
                  style={{ touchAction: 'none' }}
                />
              </div>
            </div>
          )}

          {mode === 'type' && (
            <div>
              <p className="font-mono text-xs text-ghost-500 mb-3">
                Type your full name
              </p>
              <input
                type="text"
                value={typedName}
                onChange={(e) => setTypedName(e.target.value)}
                placeholder="Your full name"
                className="w-full px-4 py-3 font-mono text-lg border border-ghost-300 focus:border-purple-900 focus:outline-none mb-4"
              />

              {/* Font Selection */}
              <p className="font-mono text-xs text-ghost-500 mb-2">Select style</p>
              <div className="grid grid-cols-2 gap-2 mb-4">
                {SIGNATURE_FONTS.map((font) => (
                  <button
                    key={font.name}
                    onClick={() => setSelectedFont(font.name)}
                    className={cn(
                      'px-4 py-3 text-center border transition-colors',
                      selectedFont === font.name
                        ? 'border-purple-900 bg-purple-50'
                        : 'border-ghost-300 hover:border-purple-500'
                    )}
                  >
                    <span
                      className="text-xl"
                      style={{ fontFamily: `"${font.name}", cursive` }}
                    >
                      {typedName || 'Preview'}
                    </span>
                    <p className="font-mono text-xs text-ghost-500 mt-1">{font.label}</p>
                  </button>
                ))}
              </div>

              {/* Preview */}
              {typedName && (
                <div className="border border-ghost-200 bg-ghost-50 p-6 text-center">
                  <span
                    className="text-4xl"
                    style={{ fontFamily: `"${selectedFont}", cursive` }}
                  >
                    {typedName}
                  </span>
                </div>
              )}
            </div>
          )}

          {mode === 'upload' && (
            <div>
              <p className="font-mono text-xs text-ghost-500 mb-3">
                Upload an image of your signature
              </p>
              {uploadedImage ? (
                <div className="border border-ghost-200 bg-ghost-50 p-6 text-center">
                  <img
                    src={uploadedImage}
                    alt="Uploaded signature"
                    className="max-h-32 mx-auto"
                  />
                </div>
              ) : (
                <label className="block border-2 border-dashed border-ghost-300 rounded p-8 text-center cursor-pointer hover:border-purple-500 transition-colors">
                  <Upload className="h-8 w-8 text-ghost-400 mx-auto mb-2" />
                  <p className="font-mono text-sm text-ghost-600">
                    Click to upload or drag and drop
                  </p>
                  <p className="font-mono text-xs text-ghost-400 mt-1">
                    PNG, JPG up to 2MB
                  </p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          )}

          {/* Clear Button */}
          {hasSignature && (
            <button
              onClick={handleClear}
              className="flex items-center gap-2 mt-4 px-3 py-1.5 font-mono text-xs text-ghost-600 hover:text-purple-900"
            >
              <RotateCcw className="h-3 w-3" />
              Clear & Start Over
            </button>
          )}
        </div>
      </div>

      {/* Consent */}
      <div className="border border-ghost-300 bg-white p-6">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={consentChecked}
            onChange={(e) => setConsentChecked(e.target.checked)}
            className="mt-1 h-4 w-4 text-purple-900 border-ghost-300 focus:ring-purple-900"
          />
          <span className="font-mono text-sm text-ghost-700">{CONSENT_TEXT}</span>
        </label>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setShowDeclineDialog(true)}
          className="flex items-center gap-2 px-4 py-2 font-mono text-sm text-ghost-600 hover:text-red-600 border border-ghost-300 hover:border-red-300"
        >
          <X className="h-4 w-4" />
          DECLINE TO SIGN
        </button>

        <button
          onClick={handleSubmit}
          disabled={!hasSignature || !consentChecked || submitting}
          className="flex items-center gap-2 px-6 py-2 font-mono text-sm bg-purple-900 text-white hover:bg-purple-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              SUBMITTING...
            </>
          ) : (
            <>
              <Check className="h-4 w-4" />
              SIGN DOCUMENT
            </>
          )}
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="border border-red-300 bg-red-50 p-4">
          <p className="font-mono text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Decline Dialog */}
      {showDeclineDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-ghost-300 max-w-md w-full p-6">
            <h3 className="font-mono text-lg font-semibold text-purple-900 mb-4">
              Decline to Sign
            </h3>
            <p className="font-mono text-sm text-ghost-600 mb-4">
              Please provide a reason for declining (optional):
            </p>
            <textarea
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              placeholder="Enter reason..."
              className="w-full px-3 py-2 font-mono text-sm border border-ghost-300 focus:border-purple-900 focus:outline-none mb-4 h-24 resize-none"
            />
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowDeclineDialog(false)}
                className="px-4 py-2 font-mono text-sm text-ghost-600 hover:text-ghost-900"
              >
                CANCEL
              </button>
              <button
                onClick={handleDecline}
                disabled={submitting}
                className="px-4 py-2 font-mono text-sm bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
              >
                {submitting ? 'DECLINING...' : 'CONFIRM DECLINE'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
