import { Module, type DynamicModule } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthGuard } from './auth/auth.guard.js';
import { SupabaseJwtVerifier } from './auth/jwt-verifier.js';
import { ApiExceptionFilter } from './common/http-exception.filter.js';
import { ENV, type Env } from './config/env.js';
import { FamiliesController } from './families/families.controller.js';
import { FamilyPermissionGuard } from './families/family-permission.guard.js';
import { HealthController } from './health/health.controller.js';
import { MeController } from './me/me.controller.js';
import { SupabaseService } from './supabase/supabase.service.js';

export interface AppModuleOptions {
  env: Env;
  /** Tests inject a verifier backed by local keys. */
  verifier?: SupabaseJwtVerifier;
}

@Module({})
export class AppModule {
  static forRoot({ env, verifier }: AppModuleOptions): DynamicModule {
    return {
      module: AppModule,
      imports: [ThrottlerModule.forRoot([{ ttl: 60_000, limit: env.RATE_LIMIT_PER_MINUTE }])],
      controllers: [HealthController, MeController, FamiliesController],
      providers: [
        { provide: ENV, useValue: env },
        { provide: SupabaseJwtVerifier, useValue: verifier ?? SupabaseJwtVerifier.fromEnv(env) },
        SupabaseService,
        FamilyPermissionGuard,
        { provide: APP_GUARD, useClass: ThrottlerGuard },
        { provide: APP_GUARD, useClass: AuthGuard },
        { provide: APP_FILTER, useClass: ApiExceptionFilter },
      ],
    };
  }
}
