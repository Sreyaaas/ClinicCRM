export function normalizeIndianPhone(rawPhone: string): string {
  const digits = rawPhone.replace(/\D/g, '');
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 11 && digits.startsWith('0')) return `91${digits.slice(1)}`;
  return digits;
}

export function buildWhatsAppLink(rawPhone: string, message: string): string {
  const phone = normalizeIndianPhone(rawPhone);
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

export function buildFollowUpMessage(params: {
  patientName: string;
  clinicName: string;
  doctorName?: string;
  followUpDateText: string;
  reason?: string | null;
  lang?: 'en' | 'ml';
}): string {
  const { patientName, clinicName, doctorName, followUpDateText, reason, lang = 'en' } = params;
  if (lang === 'ml') {
    const docPart = doctorName ? ` (${doctorName})` : '';
    const reasonPart = reason ? ` - ${reason}` : '';
    return `നമസ്കാരം ${patientName}, ${clinicName}${docPart}-ൽ നിന്നുള്ള ഓർമ്മപ്പെടുത്തൽ: നിങ്ങളുടെ തുടർ പരിശോധന തീയതി ${followUpDateText} ആണ്${reasonPart}. സമയം ഉറപ്പാക്കാൻ ദയവായി മറുപടി നൽകുക.`;
  }

  const docPart = doctorName ? ` with ${doctorName}` : '';
  const reasonPart = reason ? ` (${reason})` : '';
  return `Hello ${patientName}, reminder from ${clinicName}: your follow-up visit${docPart} is scheduled for ${followUpDateText}${reasonPart}. Reply here to confirm your slot.`;
}

export function buildVisitSummaryMessage(params: {
  patientName: string;
  clinicName: string;
  doctorName: string;
  registrationNo?: string | null;
  visitDateText: string;
  items: Array<{
    medicineName: string;
    dosage?: string | null;
    timing?: string | null;
    durationDays?: number | null;
  }>;
  followUpDateText?: string | null;
  lang?: 'en' | 'ml';
}): string {
  const docHeader = params.registrationNo
    ? `${params.doctorName} (${params.registrationNo})`
    : params.doctorName;

  if (params.lang === 'ml') {
    const lines = [
      `*${params.clinicName}*`,
      `രോഗി: ${params.patientName}`,
      `ഡോക്ടർ: ${docHeader} | തീയതി: ${params.visitDateText}`,
    ];
    if (params.items.length > 0) {
      lines.push('', '*മരുന്നുകൾ:*');
      params.items.forEach((item, idx) => {
        const details = [
          item.dosage,
          item.timing,
          item.durationDays ? `${item.durationDays} ദിവസം` : null,
        ]
          .filter(Boolean)
          .join(' · ');
        lines.push(`${idx + 1}. ${item.medicineName}${details ? ` (${details})` : ''}`);
      });
    }
    if (params.followUpDateText) {
      lines.push('', `അടുത്ത പരിശോധന: ${params.followUpDateText}`);
    }
    return lines.join('\n');
  }

  const lines = [
    `*${params.clinicName}*`,
    `Patient: ${params.patientName}`,
    `Doctor: ${docHeader} | Date: ${params.visitDateText}`,
  ];

  if (params.items.length > 0) {
    lines.push('', '*Medicines:*');
    params.items.forEach((item, idx) => {
      const details = [
        item.dosage,
        item.timing,
        item.durationDays ? `${item.durationDays} days` : null,
      ]
        .filter(Boolean)
        .join(' · ');
      lines.push(`${idx + 1}. ${item.medicineName}${details ? ` (${details})` : ''}`);
    });
  }

  if (params.followUpDateText) {
    lines.push('', `Next Review: ${params.followUpDateText}`);
  }

  return lines.join('\n');
}
