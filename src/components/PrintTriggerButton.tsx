'use client';

import { IconPrinter } from './Icons';

export function PrintTriggerButton({ label = 'Print or save PDF' }: { label?: string }) {
  return (
    <button type="button" onClick={() => window.print()} className="btn btn-primary">
      <IconPrinter />
      {label}
    </button>
  );
}
