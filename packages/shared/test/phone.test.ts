import { describe, expect, it } from 'vitest';
import { COUNTRY_CODES, formatPhone, fromAuthPhone, maskPhone, normalizePhone } from '../src/phone';

const UAE = COUNTRY_CODES.find((c) => c.iso === 'AE')!;

describe('normalizePhone (default +91)', () => {
  it.each([
    ['9876543210', '+919876543210'],
    ['98765 43210', '+919876543210'],
    ['098765-43210', '+919876543210'],
    ['+91 98765 43210', '+919876543210'],
    ['919876543210', '+919876543210'],
    ['0091 9876543210', '+919876543210'],
    ['(98765) 43210', '+919876543210'],
  ])('%s → %s', (input, expected) => {
    expect(normalizePhone(input)).toEqual({ ok: true, e164: expected });
  });

  it.each(['', '   '])('rejects empty input %j', (input) => {
    expect(normalizePhone(input)).toEqual({ ok: false, error: 'empty' });
  });

  it.each(['12345', '5876543210', '98765432101', '98765abc10', '+91 5876543210', '9+876543210'])(
    'rejects invalid Indian number %s',
    (input) => {
      expect(normalizePhone(input).ok).toBe(false);
    },
  );

  it('uses the selected country', () => {
    expect(normalizePhone('50 123 4567', UAE)).toEqual({ ok: true, e164: '+971501234567' });
  });

  it('lets a full + number override the selected country', () => {
    expect(normalizePhone('+971 50 123 4567')).toEqual({ ok: true, e164: '+971501234567' });
  });

  it('accepts other valid E.164 numbers for unlisted countries', () => {
    expect(normalizePhone('+33612345678')).toEqual({ ok: true, e164: '+33612345678' });
  });
});

describe('phone formatting', () => {
  it('formats Indian numbers in 5-5 groups', () => {
    expect(formatPhone('+919876543210')).toBe('+91 98765 43210');
  });
  it('formats other numbers with the dial code separated', () => {
    expect(formatPhone('+971501234567')).toBe('+971 501234567');
  });
  it('masks all but the country code and last 4 digits', () => {
    expect(maskPhone('+919876543210')).toBe('+91 •••••• 3210');
  });
  it('adds + to Supabase auth phone numbers', () => {
    expect(fromAuthPhone('919876543210')).toBe('+919876543210');
    expect(fromAuthPhone('+919876543210')).toBe('+919876543210');
    expect(fromAuthPhone(null)).toBeNull();
  });
});
