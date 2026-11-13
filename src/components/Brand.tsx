import Link from 'next/link';

export const BRAND_NAME = 'Nadi';
export const BRAND_TAGLINE = 'The pulse of your clinic';

/** Nadi mark — a pulse line inside a rounded tile. */
export function BrandMark({ size = 32, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={className}
    >
      <rect width="32" height="32" rx="9" fill="var(--brand)" />
      <path
        d="M6 17h5l2.2-5.5L17 22l2.6-7.5 1.4 2.5H26"
        fill="none"
        stroke="var(--brand-contrast, #fff)"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function BrandLogo({ href = '/', size = 32 }: { href?: string; size?: number }) {
  return (
    <Link href={href} className="flex items-center gap-2.5" aria-label={`${BRAND_NAME} home`}>
      <BrandMark size={size} />
      <span className="text-[17px] font-semibold tracking-[-0.02em]">{BRAND_NAME}</span>
    </Link>
  );
}
