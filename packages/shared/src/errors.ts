/** Error codes raised by database RPCs (`raise exception 'FH_…'`) and the API. */
export const ERROR_MESSAGES = {
  FH_NOT_AUTHENTICATED: 'Please sign in again.',
  FH_NOT_AUTHORIZED: "You don't have permission to do that in this family.",
  FH_REAUTH_REQUIRED: 'For your security, confirm with a fresh OTP first.',
  FH_PROFILE_INCOMPLETE: 'Add your name to your profile first.',
  FH_INVALID_INPUT: 'Some details are not valid. Please check and try again.',
  FH_INVALID_ROLE: 'That role cannot be used here.',
  FH_INVALID_PHONE: 'Enter a valid mobile number.',
  FH_ALREADY_MEMBER: 'This person is already in the family.',
  FH_TOO_MANY_INVITES: 'This family has 20 pending invitations. Revoke some before sending more.',
  FH_TOO_MANY_FAMILIES: 'You can be primary admin of up to 10 families.',
  FH_INVITE_INVALID: "That invitation code isn't valid or has already been used.",
  FH_INVITE_EXPIRED: 'That invitation has expired. Ask for a new one.',
  FH_INVITE_WRONG_PHONE: 'This invitation was sent to a different mobile number.',
  FH_RATE_LIMITED: 'Too many attempts. Please wait an hour and try again.',
  FH_MEMBER_NOT_FOUND: 'That member is no longer in this family.',
  FH_CANNOT_TARGET_SELF: "You can't do that to your own membership.",
  FH_PRIMARY_ADMIN_PROTECTED: 'The primary admin must transfer ownership before this change.',
  FH_INVALID_PRIMARY_ADMIN: 'The new primary admin must be an active admin.',
  FH_TRANSFER_REQUIRED: 'Transfer primary admin to someone else before leaving.',
  FH_CONFIRMATION_MISMATCH: "The family name you typed doesn't match.",
  FH_PERMISSION_NOT_GRANTABLE: 'That permission is reserved for admins.',
} as const;

export type ErrorCode = keyof typeof ERROR_MESSAGES;

export function isErrorCode(value: unknown): value is ErrorCode {
  return typeof value === 'string' && value in ERROR_MESSAGES;
}

/** Finds an FH_ error code inside any error-ish value (PostgREST error, Error, string). */
export function extractErrorCode(error: unknown): ErrorCode | null {
  const candidates: unknown[] = [];
  if (typeof error === 'string') candidates.push(error);
  if (error && typeof error === 'object') {
    const e = error as Record<string, unknown>;
    candidates.push(e.code, e.message, e.error, e.details);
  }
  for (const c of candidates) {
    if (typeof c !== 'string') continue;
    const match = c.match(/FH_[A-Z_]+/);
    if (match && isErrorCode(match[0])) return match[0];
  }
  return null;
}

export function friendlyErrorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  const code = extractErrorCode(error);
  if (code) return ERROR_MESSAGES[code];
  if (error && typeof error === 'object' && 'message' in error) {
    const message = String((error as { message: unknown }).message);
    if (/network|fetch|timed? ?out/i.test(message)) return "Can't reach FamilyHub. Check your connection and try again.";
  }
  return fallback;
}
