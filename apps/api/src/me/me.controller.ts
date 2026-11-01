import { Controller, Get, Inject } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { MyFamily } from '@familyhub/shared';
import { CurrentUser } from '../auth/auth.guard.js';
import type { AuthUser } from '../auth/jwt-verifier.js';
import { SupabaseService } from '../supabase/supabase.service.js';

@ApiTags('me')
@ApiBearerAuth()
@Controller({ path: 'me', version: '1' })
export class MeController {
  constructor(@Inject(SupabaseService) private readonly supabase: SupabaseService) {}

  @Get()
  @ApiOperation({ summary: 'The signed-in user, their profile and family memberships' })
  async me(@CurrentUser() user: AuthUser) {
    const [profile, families] = await Promise.all([
      this.supabase.getProfile(user),
      this.supabase.rpc<MyFamily[]>(user, 'my_families'),
    ]);
    return { user: { id: user.id, phone: user.phone }, profile, families };
  }
}
