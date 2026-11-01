import { describe, expect, it } from 'vitest';
import {
  INVITE_CODE_ALPHABET,
  buildInviteLink,
  buildInviteMessage,
  extractInviteCode,
  formatInviteCode,
  normalizeInviteCode,
} from '../src/invite';

describe('invite codes', () => {
  it('alphabet has no look-alike characters', () => {
    for (const ch of ['I', 'L', 'O', '0', '1']) expect(INVITE_CODE_ALPHABET).not.toContain(ch);
    expect(new Set(INVITE_CODE_ALPHABET).size).toBe(INVITE_CODE_ALPHABET.length);
  });

  it.each([
    ['K7QM-4XPA', 'K7QM4XPA'],
    ['k7qm 4xpa', 'K7QM4XPA'],
    [' K7QM4XPA ', 'K7QM4XPA'],
  ])('normalises %j', (input, expected) => {
    expect(normalizeInviteCode(input)).toBe(expected);
  });

  it.each(['', 'K7QM-4XP', 'K7QM-4XPAA', 'K7QM-4XP0', 'ILO1-ABCD'])('rejects %j', (input) => {
    expect(normalizeInviteCode(input)).toBeNull();
  });

  it('formats as two groups of four', () => {
    expect(formatInviteCode('K7QM4XPA')).toBe('K7QM-4XPA');
  });

  it('builds a deep link', () => {
    expect(buildInviteLink('k7qm4xpa')).toBe('familyhub://join?code=K7QM-4XPA');
  });

  it.each([
    ['K7QM-4XPA', 'K7QM4XPA'],
    ['familyhub://join?code=K7QM-4XPA', 'K7QM4XPA'],
    ['https://familyhub.app/join?ref=sms&code=k7qm-4xpa', 'K7QM4XPA'],
    ['hello world', null],
    ['familyhub://join?code=BAD', null],
  ])('extracts the code from %j', (input, expected) => {
    expect(extractInviteCode(input)).toBe(expected);
  });

  it('writes a share message containing the code and link', () => {
    const msg = buildInviteMessage({
      familyName: 'Yadav Family',
      inviterName: 'Jeet',
      code: 'K7QM4XPA',
      expiresAt: new Date('2026-11-08T10:00:00Z'),
    });
    expect(msg).toContain('Jeet invited you to join "Yadav Family"');
    expect(msg).toContain('K7QM-4XPA');
    expect(msg).toContain('familyhub://join?code=K7QM-4XPA');
  });
});
