import { GoogleGenAI } from '@google/genai';

export interface ExtractedPatientInfo {
  name?: string | null;
  ageYears?: number | null;
  gender?: 'MALE' | 'FEMALE' | 'OTHER' | null;
  phone?: string | null;
  place?: string | null;
}

export interface ExtractedVitals {
  bp?: string | null;
  temp?: string | null;
  pulse?: string | null;
  weight?: string | null;
  spo2?: string | null;
}

export interface ExtractedPrescriptionItem {
  medicineName: string;
  dosage?: string | null;
  timing?: string | null;
  durationDays?: number | null;
  instructions?: string | null;
}

export interface PrescriptionOcrData {
  patient: ExtractedPatientInfo | null;
  visit: {
    chiefComplaint: string | null;
    vitals: ExtractedVitals | null;
    diagnosis: string | null;
    clinicalNotes: string | null;
    followUpDays: number | null;
    followUpReason: string | null;
  };
  prescriptions: ExtractedPrescriptionItem[];
  rawSummary: string | null;
  confidenceScore: number;
}

/**
 * Standardize doctor dosage shorthand to the 1-0-1 / 1-0-0 format used in Indian clinics.
 */
export function normalizeDosage(val?: string | null): string {
  if (!val) return '1-0-1';
  const clean = val.trim();
  const upper = clean.toUpperCase();

  if (/^\d-\d-\d(-\d)?$/.test(clean)) return clean;
  if (upper === 'OD' || upper.includes('ONCE DAILY')) return '1-0-0';
  if (upper === 'BD' || upper === 'BID' || upper.includes('TWICE DAILY')) return '1-0-1';
  if (upper === 'TDS' || upper === 'TID' || upper.includes('THRICE DAILY')) return '1-1-1';
  if (upper === 'QID' || upper.includes('FOUR TIMES')) return '1-1-1-1';
  if (upper === 'HS' || upper.includes('BEDTIME') || upper.includes('NIGHT')) return '0-0-1';
  if (upper === 'SOS' || upper === 'PRN' || upper.includes('AS NEEDED')) return '1 tab SOS';

  return clean;
}

/**
 * Standardize timing strings to clear instructions.
 */
export function normalizeTiming(val?: string | null): string {
  if (!val) return 'After food';
  const clean = val.trim();
  const upper = clean.toUpperCase();

  if (upper === 'PC' || upper.includes('AFTER FOOD') || upper.includes('AFTER MEAL')) return 'After food';
  if (upper === 'AC' || upper.includes('BEFORE FOOD') || upper.includes('BEFORE MEAL')) return 'Before food';
  if (upper.includes('BEFORE BREAKFAST') || upper.includes('EMPTY STOMACH')) return 'Before breakfast';
  if (upper.includes('BEDTIME') || upper.includes('NIGHT')) return 'At bedtime';
  if (upper.includes('WITH FOOD')) return 'With food';

  return clean;
}

const PRESCRIPTION_EXTRACTION_SCHEMA = {
  type: 'object',
  properties: {
    patient: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Patient full name if written on slip' },
        ageYears: { type: 'number', description: 'Patient age in years' },
        gender: { type: 'string', enum: ['MALE', 'FEMALE', 'OTHER'], description: 'MALE, FEMALE, or OTHER' },
        phone: { type: 'string', description: '10-digit mobile number if written' },
        place: { type: 'string', description: 'City/town/locality of patient' },
      },
    },
    visit: {
      type: 'object',
      properties: {
        chiefComplaint: { type: 'string', description: 'Chief complaint, symptoms, fever x 3 days, cough, etc.' },
        vitals: {
          type: 'object',
          properties: {
            bp: { type: 'string', description: 'e.g. 120/80' },
            temp: { type: 'string', description: 'e.g. 99.4F or 38C' },
            pulse: { type: 'string', description: 'Heart rate / pulse e.g. 78' },
            weight: { type: 'string', description: 'e.g. 68kg' },
            spo2: { type: 'string', description: 'e.g. 98%' },
          },
        },
        diagnosis: { type: 'string', description: 'Provisional or confirmed clinical diagnosis' },
        clinicalNotes: { type: 'string', description: 'Doctor clinical notes, advice, examination findings' },
        followUpDays: { type: 'number', description: 'Days until follow-up review (e.g. 3, 5, 7, 14, 30)' },
        followUpReason: { type: 'string', description: 'Reason for review e.g. Review after 3 days with blood report' },
      },
    },
    prescriptions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          medicineName: {
            type: 'string',
            description: 'Brand or generic medicine name with formulation prefix (e.g. Tab. Paracetamol 650mg, Syp. Ascoril D, Cap. Amoxyclav 625)',
          },
          dosage: {
            type: 'string',
            description: 'Dosage pattern: 1-0-1, 1-0-0, 1-1-1, 0-0-1, or 1 tab SOS',
          },
          timing: {
            type: 'string',
            description: 'Timing relative to meals: After food, Before breakfast, At bedtime, etc.',
          },
          durationDays: {
            type: 'number',
            description: 'Number of days to take medicine (e.g. 3, 5, 7, 30)',
          },
          instructions: {
            type: 'string',
            description: 'Specific patient instructions like SOS in high fever, warm water gargles, etc.',
          },
        },
        required: ['medicineName'],
      },
    },
    rawSummary: {
      type: 'string',
      description: 'One-line medical summary of the slip',
    },
    confidenceScore: {
      type: 'number',
      description: 'Confidence between 0.0 and 1.0 regarding handwriting legibility and accuracy',
    },
  },
  required: ['prescriptions'],
};

const OCR_SYSTEM_PROMPT = `You are an expert Clinical Pharmacist and Medical OCR AI specializing in reading handwritten doctor prescriptions, outpatient slips, and clinic notes (particularly Indian and international clinical handwriting).

Extract all clinical details with maximum medical accuracy:
1. Patient Info: Read Name, Age, Gender, Phone, Place if present.
2. Vitals: Extract BP, Pulse, Temperature, SpO2, and Weight accurately.
3. Diagnosis & Complaints: Extract chief complaints, provisional diagnosis, and clinical advice.
4. Prescriptions:
   - Identify brand and generic names accurately (e.g. Dolo 650, Telma 40, Metformin 500 SR, Augmentin 625, Pan 40, Montair LC, Azithral 500, etc.).
   - Standardize dosage notation:
     * OD -> 1-0-0
     * BD / BID -> 1-0-1
     * TDS / TID -> 1-1-1
     * QID -> 1-1-1-1
     * HS / Night -> 0-0-1
     * SOS / PRN -> 1 tab SOS
   - Timing: "After food", "Before breakfast", "Before food", "At bedtime", "With food".
   - Duration in days (e.g. "x 3d" -> 3, "x 1 wk" -> 7, "x 1 mo" -> 30).
5. If handwriting is ambiguous, use clinical context (e.g., standard adult dosages, common drug combinations) to determine the most probable standard medicine.
Return STRICT JSON conforming to the schema. Do not output conversational filler.`;

export async function extractPrescriptionWithGemini(params: {
  imageBase64: string;
  mimeType?: string;
  apiKey?: string;
  modelName?: string;
}): Promise<PrescriptionOcrData> {
  const apiKey = params.apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured. Add GEMINI_API_KEY to your .env file.');
  }

  const model = params.modelName || process.env.GEMINI_MODEL || 'gemini-3.8-flash';
  const mimeType = params.mimeType || 'image/jpeg';

  const ai = new GoogleGenAI({ apiKey });

  const response = await ai.interactions.create({
    model,
    input: [
      {
        type: 'text',
        text: OCR_SYSTEM_PROMPT,
      },
      {
        type: 'image',
        data: params.imageBase64,
        mime_type: mimeType,
      },
    ],
    response_format: {
      type: 'text',
      mime_type: 'application/json',
      schema: PRESCRIPTION_EXTRACTION_SCHEMA,
    },
  });

  const text = response.output_text?.trim() || '';
  if (!text) {
    throw new Error('Gemini returned an empty response. Please check image clarity.');
  }

  // Parse JSON output
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(text) as Record<string, unknown>;
  } catch {
    // Fallback: strip code blocks if present
    const cleanText = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
    parsed = JSON.parse(cleanText) as Record<string, unknown>;
  }

  // Normalize prescriptions
  const rawPrescriptions = Array.isArray(parsed.prescriptions)
    ? (parsed.prescriptions as Array<Record<string, unknown>>)
    : [];
  const prescriptions: ExtractedPrescriptionItem[] = rawPrescriptions.map((p) => ({
    medicineName: String(p.medicineName || '').trim(),
    dosage: normalizeDosage(typeof p.dosage === 'string' ? p.dosage : null),
    timing: normalizeTiming(typeof p.timing === 'string' ? p.timing : null),
    durationDays: typeof p.durationDays === 'number' && p.durationDays > 0 ? p.durationDays : 5,
    instructions: p.instructions ? String(p.instructions).trim() : null,
  }));

  const rawPatient = (parsed.patient && typeof parsed.patient === 'object'
    ? parsed.patient
    : null) as Record<string, unknown> | null;
  const rawVisit = (parsed.visit && typeof parsed.visit === 'object'
    ? parsed.visit
    : null) as Record<string, unknown> | null;
  const rawVitals = (rawVisit?.vitals && typeof rawVisit.vitals === 'object'
    ? rawVisit.vitals
    : null) as Record<string, unknown> | null;

  return {
    patient: rawPatient
      ? {
          name: rawPatient.name ? String(rawPatient.name).trim() : null,
          ageYears: typeof rawPatient.ageYears === 'number' ? rawPatient.ageYears : null,
          gender: ['MALE', 'FEMALE', 'OTHER'].includes(String(rawPatient.gender))
            ? (rawPatient.gender as 'MALE' | 'FEMALE' | 'OTHER')
            : null,
          phone: rawPatient.phone ? String(rawPatient.phone).replace(/\D/g, '') : null,
          place: rawPatient.place ? String(rawPatient.place).trim() : null,
        }
      : null,
    visit: {
      chiefComplaint: rawVisit?.chiefComplaint ? String(rawVisit.chiefComplaint).trim() : null,
      vitals: rawVitals
        ? {
            bp: rawVitals.bp ? String(rawVitals.bp).trim() : null,
            temp: rawVitals.temp ? String(rawVitals.temp).trim() : null,
            pulse: rawVitals.pulse ? String(rawVitals.pulse).trim() : null,
            weight: rawVitals.weight ? String(rawVitals.weight).trim() : null,
            spo2: rawVitals.spo2 ? String(rawVitals.spo2).trim() : null,
          }
        : null,
      diagnosis: rawVisit?.diagnosis ? String(rawVisit.diagnosis).trim() : null,
      clinicalNotes: rawVisit?.clinicalNotes ? String(rawVisit.clinicalNotes).trim() : null,
      followUpDays: typeof rawVisit?.followUpDays === 'number' ? rawVisit.followUpDays : null,
      followUpReason: rawVisit?.followUpReason ? String(rawVisit.followUpReason).trim() : null,
    },
    prescriptions,
    rawSummary: parsed.rawSummary ? String(parsed.rawSummary).trim() : null,
    confidenceScore: typeof parsed.confidenceScore === 'number' ? parsed.confidenceScore : 0.9,
  };
}
