'use client';

import { useRef, useState } from 'react';
import type { PrescriptionOcrData } from '@/lib/gemini-ocr';
import { optimizePrescriptionImage } from '@/lib/image-compress';
import {
  IconAlert,
  IconCamera,
  IconCheck,
  IconRefresh,
  IconSparkle,
  IconUpload,
} from './Icons';
import { Badge, Modal, toast } from './ui';

export interface PrescriptionOcrModalProps {
  open: boolean;
  onClose: () => void;
  onApplyExtractedData: (data: PrescriptionOcrData, optimizedFile?: File) => void;
  initialPatientName?: string;
}

export function PrescriptionOcrModal({
  open,
  onClose,
  onApplyExtractedData,
  initialPatientName,
}: PrescriptionOcrModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'optimizing' | 'reading' | 'success' | 'error'>('idle');
  const [statusText, setStatusText] = useState<string>('');
  const [tokenSavings, setTokenSavings] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [keyMissing, setKeyMissing] = useState(false);
  const [manualKey, setManualKey] = useState('');
  const [extractedData, setExtractedData] = useState<PrescriptionOcrData | null>(null);
  const [optimizedFile, setOptimizedFile] = useState<File | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  function resetState() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    setStatus('idle');
    setStatusText('');
    setTokenSavings(null);
    setErrorMsg(null);
    setKeyMissing(false);
    setExtractedData(null);
    setOptimizedFile(null);
  }

  function handleClose() {
    resetState();
    onClose();
  }

  async function processImage(selectedFile: File, userApiKey?: string) {
    setErrorMsg(null);
    setKeyMissing(false);
    setFile(selectedFile);

    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);

    try {
      // Step 1: Optimize client-side to save tokens & upload bandwidth
      setStatus('optimizing');
      setStatusText('Optimizing image & tokens (resizing to 1600px max)...');

      const opt = await optimizePrescriptionImage(selectedFile, 1600, 0.85);
      setOptimizedFile(opt.file);

      const savedPercent = Math.round((1 - opt.optimizedSizeBytes / opt.originalSizeBytes) * 100);
      if (savedPercent > 0) {
        setTokenSavings(`Saved ${savedPercent}% tokens (${Math.round(opt.originalSizeBytes / 1024)}KB → ${Math.round(opt.optimizedSizeBytes / 1024)}KB)`);
      }

      // Step 2: Gemini Multimodal Interaction
      setStatus('reading');
      setStatusText('Gemini 3.8 Flash reading prescription handwriting & extracting medicines...');

      const res = await fetch('/api/ocr/prescription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(userApiKey ? { 'x-gemini-key': userApiKey } : {}),
        },
        body: JSON.stringify({
          imageBase64: opt.base64Data,
          mimeType: opt.mimeType,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        if (json.code === 'GEMINI_KEY_MISSING') {
          setKeyMissing(true);
          throw new Error('Gemini API key is not configured. Add GEMINI_API_KEY to your .env file or enter a key below.');
        }
        throw new Error(json.error || 'Failed to extract prescription details');
      }

      setStatus('success');
      setStatusText('Prescription extracted successfully!');
      setExtractedData(json.data);
      toast('Prescription details extracted by Gemini OCR!');
    } catch (err) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Error extracting prescription');
    }
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile && droppedFile.type.startsWith('image/')) {
      void processImage(droppedFile);
    }
  }

  // Quick Demo Prescription generator for instant testing
  function loadDemoPrescription() {
    const demoData: PrescriptionOcrData = {
      patient: {
        name: initialPatientName || 'K. Ramanathan',
        ageYears: 48,
        gender: 'MALE',
        phone: '9847123456',
        place: 'Kochi',
      },
      visit: {
        chiefComplaint: 'High grade fever x 3 days, body aches, dry cough',
        vitals: {
          bp: '126/82',
          temp: '101.4 °F',
          pulse: '84',
          weight: '72kg',
          spo2: '98%',
        },
        diagnosis: 'Acute Viral Syndrome / Upper Respiratory Infection',
        clinicalNotes: 'Adequate hydration advised. Review if fever spikes above 102°F or persists beyond 3 days.',
        followUpDays: 3,
        followUpReason: '3-day fever review with routine CBC report',
      },
      prescriptions: [
        {
          medicineName: 'Tab. Paracetamol 650mg (Dolo)',
          dosage: '1-0-1',
          timing: 'After food',
          durationDays: 3,
          instructions: 'Take 1 tab SOS for fever spikes > 100°F (max 3/day)',
        },
        {
          medicineName: 'Tab. Amoxyclav 625mg',
          dosage: '1-0-1',
          timing: 'After food',
          durationDays: 5,
          instructions: 'Complete full 5-day course',
        },
        {
          medicineName: 'Tab. Pantoprazole 40mg',
          dosage: '1-0-0',
          timing: 'Before breakfast',
          durationDays: 5,
          instructions: 'Take 30 mins before morning meal',
        },
        {
          medicineName: 'Syp. Ascoril D (100ml)',
          dosage: '1-1-1',
          timing: 'After food',
          durationDays: 5,
          instructions: '10ml thrice daily for dry cough',
        },
      ],
      rawSummary: 'Acute Viral Infection with fever and URI; 4 standard medications prescribed with 3-day follow-up.',
      confidenceScore: 0.96,
    };

    setStatus('success');
    setStatusText('Loaded sample clinical prescription for demonstration!');
    setTokenSavings('Token optimization active (1600px JPEG format)');
    setExtractedData(demoData);
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Instant Prescription OCR (Gemini AI)"
      description="Upload or snap a photo of any doctor prescription or outpatient slip. Gemini extracts medicines, vitals, diagnosis, and patient details to auto-populate the chart."
      size="lg"
      closedby="closerequest"
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={handleClose}>
            Cancel
          </button>
          {extractedData && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                onApplyExtractedData(extractedData, optimizedFile ?? undefined);
                handleClose();
              }}
            >
              <IconCheck />
              Apply to Consultation
            </button>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-5">
        {/* API Key Missing Alert with Inline Configuration */}
        {keyMissing && (
          <div className="rounded-[var(--r-card)] border border-warning/40 bg-warning-light p-4 text-[13px] text-warning-ink">
            <div className="flex items-start gap-2.5">
              <IconAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
              <div className="flex-1">
                <p className="font-semibold">Gemini API Key Required</p>
                <p className="mt-1 text-muted">
                  To enable live AI prescription scanning, add your free Gemini key to{' '}
                  <code className="rounded bg-surface-2 px-1 py-0.5 font-mono text-[11px]">.env</code>:
                </p>
                <pre className="mt-2 rounded bg-surface p-2 font-mono text-[11.5px] select-all">
                  GEMINI_API_KEY=&quot;your_key_here&quot;
                </pre>
                <p className="mt-2 text-[12px]">
                  You can get a free key in 30 seconds at{' '}
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-brand hover:underline"
                  >
                    Google AI Studio (aistudio.google.com) ↗
                  </a>
                </p>

                {/* Or Quick Test Key Input */}
                <div className="mt-3 flex items-center gap-2">
                  <input
                    type="password"
                    placeholder="Or paste API key here to test now..."
                    value={manualKey}
                    onChange={(e) => setManualKey(e.target.value)}
                    className="input input-sm flex-1 font-mono text-[12px]"
                  />
                  <button
                    type="button"
                    disabled={!manualKey || !file}
                    onClick={() => file && void processImage(file, manualKey)}
                    className="btn btn-primary btn-sm"
                  >
                    Retry with Key
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Upload / Camera Dropzone */}
        {status !== 'success' && (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className={`relative flex flex-col items-center justify-center rounded-[var(--r-card)] border-2 border-dashed p-6 text-center transition-all ${
              status === 'optimizing' || status === 'reading'
                ? 'border-brand bg-brand-light/30'
                : 'border-line-strong hover:border-brand/70 hover:bg-surface-2'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void processImage(f);
              }}
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void processImage(f);
              }}
            />

            {status === 'optimizing' || status === 'reading' ? (
              <div className="flex flex-col items-center gap-3 py-4">
                <div className="relative">
                  <IconSparkle className="h-8 w-8 text-brand animate-spin" />
                </div>
                <div className="flex flex-col items-center gap-1">
                  <span className="text-[14px] font-semibold text-brand-ink">{statusText}</span>
                  {tokenSavings && (
                    <span className="text-[12px] font-medium text-success-ink">
                      ⚡ {tokenSavings}
                    </span>
                  )}
                </div>
                <p className="max-w-md text-[12px] text-muted">
                  Extracting patient details, vitals, diagnosis, and prescriptions via Gemini multimodal vision...
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-light text-brand">
                  <IconSparkle className="h-6 w-6" />
                </div>
                <div className="flex flex-col items-center gap-1">
                  <span className="text-[15px] font-semibold">Upload or Snap Prescription Photo</span>
                  <span className="text-[12.5px] text-muted">
                    Supports handwritten doctor slips, OPD sheets, printed lab Rxs, or clinic notes.
                  </span>
                </div>

                <div className="mt-2 flex flex-wrap items-center justify-center gap-2.5">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => cameraInputRef.current?.click()}
                  >
                    <IconCamera />
                    Take Photo (Camera)
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <IconUpload />
                    Choose File / Drop Image
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost text-brand-ink"
                    onClick={loadDemoPrescription}
                  >
                    <IconSparkle className="text-brand" />
                    Try Sample Kerala Prescription
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Error message */}
        {errorMsg && !keyMissing && (
          <div role="alert" className="alert alert-danger">
            <IconAlert />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Extracted Results Preview */}
        {extractedData && (
          <div className="flex flex-col gap-4">
            {/* Header pill with token savings */}
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--r-control)] bg-success-light px-3.5 py-2 text-[12.5px] text-success-ink">
              <span className="flex items-center gap-2 font-medium">
                <IconCheck className="h-4 w-4 text-success" />
                Prescription parsed with {Math.round(extractedData.confidenceScore * 100)}% confidence
              </span>
              {tokenSavings && (
                <span className="rounded bg-surface/70 px-2 py-0.5 font-mono text-[11px] text-muted">
                  {tokenSavings}
                </span>
              )}
            </div>

            {/* Grid of parsed details */}
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Diagnosis & Complaints */}
              <div className="rounded-[var(--r-card)] border border-line p-3.5 bg-surface-2/40">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                  Diagnosis & Complaint
                </span>
                <p className="mt-1 text-[14px] font-medium text-fg">
                  {extractedData.visit.diagnosis || 'Diagnosis not specified'}
                </p>
                {extractedData.visit.chiefComplaint && (
                  <p className="mt-1 text-[12.5px] text-muted">
                    <span className="font-medium text-fg">Complaint:</span> {extractedData.visit.chiefComplaint}
                  </p>
                )}
                {extractedData.visit.clinicalNotes && (
                  <p className="mt-1 text-[12px] text-muted italic">
                    &quot;{extractedData.visit.clinicalNotes}&quot;
                  </p>
                )}
              </div>

              {/* Vitals */}
              <div className="rounded-[var(--r-card)] border border-line p-3.5 bg-surface-2/40">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                  Extracted Vitals
                </span>
                <div className="mt-1.5 flex flex-wrap gap-2 text-[12px]">
                  {extractedData.visit.vitals?.bp && (
                    <Badge tone="brand">BP: {extractedData.visit.vitals.bp}</Badge>
                  )}
                  {extractedData.visit.vitals?.temp && (
                    <Badge tone="brand">Temp: {extractedData.visit.vitals.temp}</Badge>
                  )}
                  {extractedData.visit.vitals?.pulse && (
                    <Badge tone="brand">Pulse: {extractedData.visit.vitals.pulse} bpm</Badge>
                  )}
                  {extractedData.visit.vitals?.spo2 && (
                    <Badge tone="brand">SpO₂: {extractedData.visit.vitals.spo2}</Badge>
                  )}
                  {extractedData.visit.vitals?.weight && (
                    <Badge tone="brand">Weight: {extractedData.visit.vitals.weight}</Badge>
                  )}
                  {(!extractedData.visit.vitals || Object.values(extractedData.visit.vitals).every((v) => !v)) && (
                    <span className="text-muted">None noted on slip</span>
                  )}
                </div>
                {extractedData.visit.followUpDays && (
                  <p className="mt-2 text-[12px] text-muted">
                    Follow-up: <strong className="font-semibold text-fg">{extractedData.visit.followUpDays} days</strong> ({extractedData.visit.followUpReason || 'Review'})
                  </p>
                )}
              </div>
            </div>

            {/* Prescribed Medicines Table */}
            <div className="rounded-[var(--r-card)] border border-line overflow-hidden">
              <div className="flex items-center justify-between border-b border-line bg-surface-2 px-3.5 py-2">
                <span className="text-[12.5px] font-semibold">
                  Extracted Medicines ({extractedData.prescriptions.length})
                </span>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm text-[12px]"
                  onClick={() => {
                    setExtractedData(null);
                    setStatus('idle');
                  }}
                >
                  <IconRefresh className="h-3.5 w-3.5" />
                  Scan Another
                </button>
              </div>

              <div className="divide-y divide-line">
                {extractedData.prescriptions.map((p, idx) => (
                  <div key={idx} className="flex flex-wrap items-center justify-between gap-2 p-3 text-[13px]">
                    <div className="min-w-0">
                      <span className="font-semibold text-fg">{p.medicineName}</span>
                      {p.instructions && (
                        <p className="text-[11.5px] text-muted">{p.instructions}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[12px]">
                      <Badge tone="neutral" className="font-mono">
                        {p.dosage || '1-0-1'}
                      </Badge>
                      <span className="text-muted">{p.timing || 'After food'}</span>
                      <span className="text-muted">× {p.durationDays || 5} days</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Patient details banner if found */}
            {extractedData.patient?.name && (
              <div className="rounded-[var(--r-card)] border border-line p-3 text-[12px] text-muted flex items-center justify-between">
                <span>
                  Patient Header on Slip: <strong className="text-fg">{extractedData.patient.name}</strong>
                  {extractedData.patient.ageYears && ` · ${extractedData.patient.ageYears} yrs`}
                  {extractedData.patient.gender && ` · ${extractedData.patient.gender}`}
                  {extractedData.patient.phone && ` · ${extractedData.patient.phone}`}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
