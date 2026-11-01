import { Controller, Get, Inject, ServiceUnavailableException } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/auth.guard.js';
import { SupabaseService } from '../supabase/supabase.service.js';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(@Inject(SupabaseService) private readonly supabase: SupabaseService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Liveness: the process is running' })
  live() {
    return { status: 'ok' };
  }

  @Public()
  @Get('ready')
  @ApiOperation({ summary: 'Readiness: Supabase is reachable' })
  async ready() {
    if (!(await this.supabase.ping())) {
      throw new ServiceUnavailableException({ code: 'FH_UPSTREAM_ERROR', message: 'Supabase is not reachable' });
    }
    return { status: 'ready' };
  }
}
