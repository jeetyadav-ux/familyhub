/**
 * Who can see a record. Every record type from Phase 2 onwards carries one of these
 * (owner decision, 1 Nov 2026): it stays in the owner's personal records, or it is shared
 * with the whole family. New records start as personal; sharing is always an explicit choice.
 */
export const RECORD_VISIBILITIES = ['personal', 'family'] as const;
export type RecordVisibility = (typeof RECORD_VISIBILITIES)[number];

export const DEFAULT_RECORD_VISIBILITY: RecordVisibility = 'personal';

export const VISIBILITY_INFO: Record<RecordVisibility, { label: string; description: string; icon: string }> = {
  personal: {
    label: 'Personal',
    description: 'Only you can see this.',
    icon: 'lock-closed-outline',
  },
  family: {
    label: 'Family',
    description: 'Everyone in the family who has access to this section can see it.',
    icon: 'people-outline',
  },
};

export function isRecordVisibility(value: unknown): value is RecordVisibility {
  return typeof value === 'string' && (RECORD_VISIBILITIES as readonly string[]).includes(value);
}
