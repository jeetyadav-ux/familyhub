import { describe, expect, it } from 'vitest';
import { ASSIGNABLE_ROLES, FAMILY_ROLES, isAssignableRole } from '../src/roles';
import { DEFAULT_RECORD_VISIBILITY, RECORD_VISIBILITIES, VISIBILITY_INFO, isRecordVisibility } from '../src/visibility';

describe('assignable roles', () => {
  it('hides the Child role', () => {
    expect(ASSIGNABLE_ROLES).toEqual(['admin', 'adult', 'viewer']);
    expect(isAssignableRole('child')).toBe(false);
    expect(isAssignableRole('adult')).toBe(true);
  });

  it('only contains real roles', () => {
    for (const r of ASSIGNABLE_ROLES) expect(FAMILY_ROLES).toContain(r);
  });
});

describe('record visibility', () => {
  it('offers exactly Personal and Family', () => {
    expect(RECORD_VISIBILITIES).toEqual(['personal', 'family']);
    expect(VISIBILITY_INFO.personal.label).toBe('Personal');
    expect(VISIBILITY_INFO.family.label).toBe('Family');
  });

  it('keeps new records personal until someone chooses to share', () => {
    expect(DEFAULT_RECORD_VISIBILITY).toBe('personal');
  });

  it('validates values', () => {
    expect(isRecordVisibility('family')).toBe(true);
    expect(isRecordVisibility('shared')).toBe(false);
    expect(isRecordVisibility(null)).toBe(false);
  });
});
