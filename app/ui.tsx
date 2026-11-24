import Link from "next/link";

export function Brand({ href }: { href: string }) {
  return (
    <Link href={href} className="brand">
      <span className="brand-mark" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 3v4a3 3 0 0 0 6 0V3M8 3v18m8-7h3m0-11c-3 2-4 6-4 11h4m0-11v18" />
        </svg>
      </span>
      <span>Food Tracker</span>
    </Link>
  );
}
