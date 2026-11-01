export interface CountryCode {
  iso: string;
  name: string;
  dialCode: string; // e.g. "+91"
  /** National significant number length(s) used for basic validation. */
  lengths: readonly number[];
  /** Optional stricter pattern for the national number. */
  pattern?: RegExp;
}

export const COUNTRY_CODES: readonly CountryCode[] = [
  { iso: 'IN', name: 'India', dialCode: '+91', lengths: [10], pattern: /^[6-9]\d{9}$/ },
  { iso: 'AE', name: 'United Arab Emirates', dialCode: '+971', lengths: [9] },
  { iso: 'US', name: 'United States', dialCode: '+1', lengths: [10] },
  { iso: 'CA', name: 'Canada', dialCode: '+1', lengths: [10] },
  { iso: 'GB', name: 'United Kingdom', dialCode: '+44', lengths: [10] },
  { iso: 'SG', name: 'Singapore', dialCode: '+65', lengths: [8] },
  { iso: 'AU', name: 'Australia', dialCode: '+61', lengths: [9] },
  { iso: 'SA', name: 'Saudi Arabia', dialCode: '+966', lengths: [9] },
  { iso: 'QA', name: 'Qatar', dialCode: '+974', lengths: [8] },
  { iso: 'KW', name: 'Kuwait', dialCode: '+965', lengths: [8] },
  { iso: 'OM', name: 'Oman', dialCode: '+968', lengths: [8] },
  { iso: 'BH', name: 'Bahrain', dialCode: '+973', lengths: [8] },
  { iso: 'NP', name: 'Nepal', dialCode: '+977', lengths: [10] },
  { iso: 'DE', name: 'Germany', dialCode: '+49', lengths: [10, 11] },
  { iso: 'NZ', name: 'New Zealand', dialCode: '+64', lengths: [8, 9, 10] },
];

export const DEFAULT_COUNTRY: CountryCode = COUNTRY_CODES[0]!;

export const E164_PATTERN = /^\+[1-9]\d{6,14}$/;

export type PhoneResult = { ok: true; e164: string } | { ok: false; error: 'empty' | 'invalid' };

/**
 * Normalises user input into E.164 for the selected country.
 * Accepts spaces, dashes, brackets, a leading 0 trunk prefix, "00" international prefix,
 * or a full "+<country><number>" string (which overrides the selected country).
 */
export function normalizePhone(input: string, country: CountryCode = DEFAULT_COUNTRY): PhoneResult {
  const raw = (input ?? '').trim();
  if (!raw) return { ok: false, error: 'empty' };

  let cleaned = raw.replace(/[\s\-().]/g, '');
  if (cleaned.startsWith('00')) cleaned = `+${cleaned.slice(2)}`;
  if (/[^\d+]/.test(cleaned) || cleaned.lastIndexOf('+') > 0) return { ok: false, error: 'invalid' };

  if (cleaned.startsWith('+')) {
    const match = COUNTRY_CODES.filter((c) => cleaned.startsWith(c.dialCode)).sort(
      (a, b) => b.dialCode.length - a.dialCode.length,
    )[0];
    if (match) return validateNational(cleaned.slice(match.dialCode.length), match);
    return E164_PATTERN.test(cleaned) ? { ok: true, e164: cleaned } : { ok: false, error: 'invalid' };
  }

  const dialDigits = country.dialCode.slice(1);
  let national = cleaned;
  if (national.startsWith('0')) national = national.replace(/^0+/, '');
  if (!country.lengths.includes(national.length) && national.startsWith(dialDigits)) {
    const withoutCode = national.slice(dialDigits.length);
    if (country.lengths.includes(withoutCode.length)) national = withoutCode;
  }
  return validateNational(national, country);
}

function validateNational(national: string, country: CountryCode): PhoneResult {
  if (!/^\d+$/.test(national)) return { ok: false, error: 'invalid' };
  if (!country.lengths.includes(national.length)) return { ok: false, error: 'invalid' };
  if (country.pattern && !country.pattern.test(national)) return { ok: false, error: 'invalid' };
  const e164 = `${country.dialCode}${national}`;
  return E164_PATTERN.test(e164) ? { ok: true, e164 } : { ok: false, error: 'invalid' };
}

/** "+919876543210" → "+91 98765 43210"; other countries get "+<code> <number>". */
export function formatPhone(e164: string | null | undefined): string {
  if (!e164) return '';
  if (e164.startsWith('+91') && e164.length === 13) {
    return `+91 ${e164.slice(3, 8)} ${e164.slice(8)}`;
  }
  const country = COUNTRY_CODES.filter((c) => e164.startsWith(c.dialCode)).sort(
    (a, b) => b.dialCode.length - a.dialCode.length,
  )[0];
  return country ? `${country.dialCode} ${e164.slice(country.dialCode.length)}` : e164;
}

/** "+919876543210" → "+91 •••••• 3210" (for activity feeds and logs). */
export function maskPhone(e164: string | null | undefined): string {
  if (!e164) return '';
  if (e164.length <= 7) return e164;
  return `${e164.slice(0, 3)} ${'•'.repeat(e164.length - 7)} ${e164.slice(-4)}`;
}

/** Supabase Auth returns phone numbers without the leading '+'. */
export function fromAuthPhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  return phone.startsWith('+') ? phone : `+${phone}`;
}
