// Small inline icons. Simple geometric marks drawn for this site, 24×24, currentColor.
type P = { className?: string };

export function GitHubIcon({ className }: P) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M12 2.2a9.8 9.8 0 0 0-3.1 19.1c.5.1.7-.2.7-.5v-1.7c-2.7.6-3.3-1.3-3.3-1.3-.4-1.1-1.1-1.4-1.1-1.4-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.5 2.3 1.1 2.9.8.1-.6.3-1.1.6-1.3-2.2-.2-4.5-1.1-4.5-4.9 0-1.1.4-2 1-2.7-.1-.2-.4-1.2.1-2.6 0 0 .8-.3 2.7 1a9.3 9.3 0 0 1 4.9 0c1.9-1.3 2.7-1 2.7-1 .5 1.4.2 2.4.1 2.6.6.7 1 1.6 1 2.7 0 3.8-2.3 4.7-4.5 4.9.4.3.7.9.7 1.8v2.7c0 .3.2.6.7.5A9.8 9.8 0 0 0 12 2.2Z"
      />
    </svg>
  );
}

export function LinkedInIcon({ className }: P) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M4.5 3.2a2 2 0 1 1 0 4 2 2 0 0 1 0-4ZM2.8 8.8h3.4V21H2.8V8.8Zm5.6 0h3.3v1.7c.5-.9 1.6-1.9 3.4-1.9 3.6 0 4.2 2.3 4.2 5.4V21h-3.4v-6.2c0-1.5 0-3.3-2-3.3s-2.3 1.6-2.3 3.2V21H8.4V8.8Z"
      />
    </svg>
  );
}

export function ScholarIcon({ className }: P) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
      <path fill="currentColor" d="M12 3 1.5 9.2 5 11.3V16c1.7 2 4.3 3.2 7 3.2s5.3-1.2 7-3.2v-4.7l2-1.2V16h1.5V9.2L12 3Z" />
    </svg>
  );
}

export function MailIcon({ className }: P) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
        d="M3.5 5.5h17v13h-17zM3.8 6l8.2 7 8.2-7"
      />
    </svg>
  );
}

export function DocIcon({ className }: P) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
        d="M6 2.8h8.5L19 7.3v13.9H6zM14.3 3v4.5H19M9 12h7M9 15.5h7"
      />
    </svg>
  );
}
