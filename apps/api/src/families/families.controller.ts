import { Controller, Get, Inject, Param, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import type { MyFamily } from '@familyhub/shared';
import { CurrentUser, type AuthedRequest } from '../auth/auth.guard.js';
import type { AuthUser } from '../auth/jwt-verifier.js';
import { SupabaseService } from '../supabase/supabase.service.js';
import { FamilyPermissionGuard, RequirePermission } from './family-permission.guard.js';

@ApiTags('families')
@ApiBearerAuth()
@UseGuards(FamilyPermissionGuard)
@Controller({ path: 'families', version: '1' })
export class FamiliesController {
  constructor(@Inject(SupabaseService) private readonly supabase: SupabaseService) {}

  @Get()
  @ApiOperation({ summary: 'Families the caller belongs to' })
  list(@CurrentUser() user: AuthUser) {
    return this.supabase.rpc<MyFamily[]>(user, 'my_families');
  }

  /**
   * The caller's effective permissions in a family. Also the reference example for
   * protecting family-scoped endpoints: later modules use @RequirePermission('finance.view_shared') etc.
   */
  @Get(':familyId/access')
  @RequirePermission()
  @ApiParam({ name: 'familyId', format: 'uuid' })
  @ApiOperation({ summary: "Caller's role-derived permissions in the family" })
  access(@Param('familyId') familyId: string, @Req() req: AuthedRequest) {
    return { familyId, permissions: req.familyPermissions ?? [] };
  }

  /** Admin-scoped example used by tests and by the Phase 5 audit export. */
  @Get(':familyId/audit-access')
  @RequirePermission('audit.view')
  @ApiParam({ name: 'familyId', format: 'uuid' })
  @ApiOperation({ summary: 'Succeeds only for members holding audit.view' })
  auditAccess(@Param('familyId') familyId: string) {
    return { familyId, allowed: true };
  }
}
