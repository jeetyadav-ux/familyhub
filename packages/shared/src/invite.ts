/** Must match app.invite_code_alphabet() in the database. No I, L, O, 0 or 1. */
export const INVITE_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const INVITE_CODE_LENGTH = 8;
export const INVITE_DEEP_LINK_SCHEME = 'familyhub';

const CODE_RE = new RegExp(`^[${INVITE_CODE_ALPHABET}]{${INVITE_CODE_LENGTH}}$`);

/** "k7qm-4xpa" → "K7QM4XPA", or null when it cannot be a valid code. */
export function normalizeInviteCode(input: string | null | undefined): string | null {
  const value = (input ?? '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  return CODE_RE.test(value) ? value : null;
}

/** "K7QM4XPA" → "K7QM-4XPA". */
export function formatInviteCode(code: string): string {
  const normalized = normalizeInviteCode(code) ?? code;
  return normalized.length === INVITE_CODE_LENGTH
    ? `${normalized.slice(0, 4)}-${normalized.slice(4)}`
    : normalized;
}

/** Deep link used in QR codes, SMS and share sheets. */
export function buildInviteLink(code: string): string {
  return `${INVITE_DEEP_LINK_SCHEME}://join?code=${formatInviteCode(code)}`;
}

/**
 * Extracts an invite code from whatever the user scanned or pasted:
 * a bare code, a familyhub:// link, or an https link with ?code=.
 */
export function extractInviteCode(text: string | null | undefined): string | null {
  const value = (text ?? '').trim();
  if (!value) return null;
  const direct = normalizeInviteCode(value);
  if (direct) return direct;
  const match = value.match(/[?&]code=([A-Za-z0-9-]+)/);
  return match ? normalizeInviteCode(decodeURIComponent(match[1]!)) : null;
}

export function buildInviteMessage(params: {
  familyName: string;
  inviterName: string;
  code: string;
  expiresAt: Date;
}): string {
  const code = formatInviteCode(params.code);
  const expires = params.expiresAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  return [
    `${params.inviterName} invited you to join "${params.familyName}" on FamilyHub.`,
    `Open the app and enter code ${code}, or tap: ${buildInviteLink(code)}`,
    `The code works once and expires on ${expires}.`,
  ].join('\n');
}
