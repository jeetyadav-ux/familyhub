import { z } from 'zod';
import { FAMILY_ROLES } from './roles';
import { normalizeInviteCode } from './invite';

export const displayNameSchema = z
  .string()
  .trim()
  .min(1, 'Enter your name')
  .max(60, 'Keep it under 60 characters');

export const familyNameSchema = z
  .string()
  .trim()
  .min(1, 'Give your family a name')
  .max(60, 'Keep it under 60 characters');

export const relationshipLabelSchema = z
  .string()
  .trim()
  .max(30, 'Keep it under 30 characters')
  .optional()
  .transform((v) => (v ? v : undefined));

export const otpSchema = z.string().regex(/^\d{6}$/, 'Enter the 6-digit code');

export const familyRoleSchema = z.enum(FAMILY_ROLES);

export const inviteCodeSchema = z
  .string()
  .transform((v, ctx) => {
    const code = normalizeInviteCode(v);
    if (!code) {
      ctx.addIssue({ code: 'custom', message: 'Enter the 8-character code, like K7QM-4XPA' });
      return z.NEVER;
    }
    return code;
  });

export const currencySchema = z.string().regex(/^[A-Z]{3}$/, 'Use a 3-letter currency code');

export const uuidSchema = z.string().uuid();

export const savedWidgetSchema = z.object({ id: z.string().min(1).max(64), visible: z.boolean() });
export const dashboardLayoutSchema = z.array(savedWidgetSchema).max(50);
