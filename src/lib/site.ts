import "server-only";

const EMAIL_RE = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;

/** Public contact address for privacy/terms requests. Set CONTACT_EMAIL; nothing is hardcoded. */
export function contactEmail(): string | null {
  const v = process.env.CONTACT_EMAIL?.trim();
  return v && EMAIL_RE.test(v) ? v : null;
}

export const REPO_URL = "https://github.com/Eric-65/ThesisBreaker-";
