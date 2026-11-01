import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  SetMetadata,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { getPermission } from '@familyhub/shared';
import type { AuthedRequest } from '../auth/auth.guard.js';
import { SupabaseService } from '../supabase/supabase.service.js';

export const REQUIRED_PERMISSION = 'familyhub:requiredPermission';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Requires the caller to be an active member of `:familyId`, optionally holding a permission.
 * Use `@RequirePermission()` for membership only. The check runs in the database
 * (public.my_permissions), the same function RLS uses, so API and app rules cannot drift.
 */
export const RequirePermission = (permission: string | null = null) => {
  if (permission && !getPermission(permission)) {
    throw new Error(`Unknown permission "${permission}" (see packages/shared/src/permissions.ts)`);
  }
  return SetMetadata(REQUIRED_PERMISSION, permission ?? '');
};

@Injectable()
export class FamilyPermissionGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(SupabaseService) private readonly supabase: SupabaseService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string | undefined>(REQUIRED_PERMISSION, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (required === undefined) return true;

    const req = context.switchToHttp().getRequest<AuthedRequest>();
    const familyId = req.params.familyId;
    if (typeof familyId !== 'string' || !UUID_RE.test(familyId)) {
      throw new BadRequestException({ code: 'FH_INVALID_INPUT', message: 'familyId must be a UUID' });
    }

    const permissions = await this.supabase.rpc<string[]>(req.user!, 'my_permissions', { p_family_id: familyId });
    // Non-members get an empty list (RLS-equivalent), so membership and permission share one check.
    if (!permissions || permissions.length === 0) {
      throw new ForbiddenException({ code: 'FH_NOT_AUTHORIZED', message: 'Not a member of this family' });
    }
    if (required && !permissions.includes(required)) {
      throw new ForbiddenException({ code: 'FH_NOT_AUTHORIZED', message: `Missing permission ${required}` });
    }
    req.familyPermissions = permissions;
    return true;
  }
}
