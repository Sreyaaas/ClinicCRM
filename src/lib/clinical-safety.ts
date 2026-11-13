export interface ClinicalSafetyAlert {
  level: 'critical' | 'warning';
  message: string;
  medicineName?: string;
}

interface SafetyDrugRule {
  allergyKeywords: string[];
  medKeywords: string[];
  warning: string;
}

const ALLERGY_CROSS_RULES: SafetyDrugRule[] = [
  {
    allergyKeywords: ['penicillin', 'amoxicillin', 'ampicillin', 'beta-lactam', 'augmentin'],
    medKeywords: ['amoxicillin', 'augmentin', 'ampicillin', 'cloxacillin', 'piperacillin', 'penicillin'],
    warning: 'Penicillin / Beta-lactam allergy conflict detected.',
  },
  {
    allergyKeywords: ['sulfa', 'sulfonamide', 'cotrimoxazole', 'bactrim', 'septran'],
    medKeywords: ['cotrimoxazole', 'bactrim', 'septran', 'sulfamethoxazole', 'furosemide', 'glimepiride', 'gliclazide'],
    warning: 'Sulfa allergy cross-reactivity alert — verify before prescribing.',
  },
  {
    allergyKeywords: ['nsaid', 'aspirin', 'ibuprofen', 'diclofenac', 'painkiller'],
    medKeywords: ['ibuprofen', 'diclofenac', 'aceclofenac', 'naproxen', 'ketorolac', 'aspirin', 'mefenamic'],
    warning: 'NSAID / Aspirin sensitivity documented on patient chart.',
  },
  {
    allergyKeywords: ['cephalosporin', 'cefixime', 'ceftriaxone', 'cefuroxime'],
    medKeywords: ['cefixime', 'ceftriaxone', 'cefuroxime', 'cefpodoxime', 'cephalexin'],
    warning: 'Cephalosporin allergy documented on patient chart.',
  },
  {
    allergyKeywords: ['macrolide', 'azithromycin', 'erythromycin', 'clarithromycin'],
    medKeywords: ['azithromycin', 'erythromycin', 'clarithromycin'],
    warning: 'Macrolide allergy conflict detected.',
  },
];

const CONDITION_CAUTION_RULES: Array<{
  conditionKeywords: string[];
  medKeywords: string[];
  warning: string;
}> = [
  {
    conditionKeywords: ['asthma', 'copd', 'bronchospasm'],
    medKeywords: ['propranolol', 'atenolol', 'metoprolol', 'ibuprofen', 'diclofenac', 'aspirin'],
    warning: 'Caution in Asthma/COPD: check beta-blocker or NSAID bronchospasm risk.',
  },
  {
    conditionKeywords: ['ckd', 'kidney', 'renal'],
    medKeywords: ['diclofenac', 'ibuprofen', 'aceclofenac', 'naproxen', 'metformin'],
    warning: 'Renal impairment caution: adjust dose or avoid nephrotoxic NSAIDs/metformin.',
  },
  {
    conditionKeywords: ['ulcer', 'gastritis', 'gerd', 'bleed'],
    medKeywords: ['diclofenac', 'ibuprofen', 'aceclofenac', 'aspirin', 'naproxen', 'prednisolone'],
    warning: 'GI ulcer/gastritis risk: verify gastroprotection or choose paracetamol.',
  },
];

export function checkPrescriptionSafety(params: {
  allergies: string | null | undefined;
  chronicConditions: string | null | undefined;
  medicines: Array<{ medicineName: string }>;
}): ClinicalSafetyAlert[] {
  const alerts: ClinicalSafetyAlert[] = [];
  const allergyText = (params.allergies ?? '').toLowerCase();
  const chronicText = (params.chronicConditions ?? '').toLowerCase();
  const seenNames = new Set<string>();

  for (const med of params.medicines) {
    const rawName = med.medicineName.trim();
    if (!rawName) continue;
    const medLower = rawName.toLowerCase();

    // Duplicate drug check
    const normalizedRoot = medLower
      .replace(/^(tab\.|cap\.|syr\.|inj\.|oint\.|drops?)\s*/i, '')
      .split(/\s+\d/)[0]
      .trim();
    if (normalizedRoot && seenNames.has(normalizedRoot)) {
      alerts.push({
        level: 'warning',
        medicineName: rawName,
        message: `Possible duplicate medicine in Rx: "${rawName}"`,
      });
    } else if (normalizedRoot) {
      seenNames.add(normalizedRoot);
    }

    if (allergyText) {
      for (const rule of ALLERGY_CROSS_RULES) {
        const hasAllergy = rule.allergyKeywords.some((k) => allergyText.includes(k));
        const hasMed = rule.medKeywords.some((k) => medLower.includes(k));
        if (hasAllergy && hasMed) {
          alerts.push({
            level: 'critical',
            medicineName: rawName,
            message: `${rawName}: ${rule.warning}`,
          });
        }
      }
      // Direct keyword match (e.g. doctor typed exact drug name in Allergies)
      if (
        normalizedRoot.length >= 4 &&
        allergyText.includes(normalizedRoot) &&
        !alerts.some((a) => a.medicineName === rawName && a.level === 'critical')
      ) {
        alerts.push({
          level: 'critical',
          medicineName: rawName,
          message: `${rawName} matches patient's documented allergies (${params.allergies}).`,
        });
      }
    }

    if (chronicText) {
      for (const rule of CONDITION_CAUTION_RULES) {
        const hasCond = rule.conditionKeywords.some((k) => chronicText.includes(k));
        const hasMed = rule.medKeywords.some((k) => medLower.includes(k));
        if (hasCond && hasMed) {
          alerts.push({
            level: 'warning',
            medicineName: rawName,
            message: `${rawName}: ${rule.warning}`,
          });
        }
      }
    }
  }

  return alerts;
}
