// Blue "verified professional" badge. Usage: <VerifiedBadge /> next to a name.
export default function VerifiedBadge({ size = 18, title = 'حساب محترف موثق' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      role="img"
      aria-label={title}
      style={{ verticalAlign: 'middle', flexShrink: 0 }}
    >
      <title>{title}</title>
      <path
        d="M12 1.8l2.5 1.7 3-.2 1.2 2.8 2.6 1.5-.5 3 1.3 2.7-1.9 2.3-.2 3-2.9.9-1.9 2.3-2.8-1.1-2.8 1.1-1.9-2.3-2.9-.9-.2-3L2.1 14.3l1.3-2.7-.5-3L5.5 7l1.2-2.8 3 .2L12 1.8z"
        fill="#0a6eb8"
      />
      <path d="M8 12.3l2.7 2.7L16.3 9.4" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
