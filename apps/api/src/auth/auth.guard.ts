import {
  Inject,
  Injectable,
  SetMetadata,
  UnauthorizedException,
  createParamDecorator,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { InvalidTokenError, SupabaseJwtVerifier, type AuthUser } from './jwt-verifier.js';

export const IS_PUBLIC = 'familyhub:isPublic';
/** Marks a route as reachable without a session (health checks only). */
export const Public = () => SetMetadata(IS_PUBLIC, true);

export interface AuthedRequest extends Request {
  user?: AuthUser;
  familyPermissions?: string[];
}

/** Global guard: every route needs a valid Supabase session unless marked @Public(). */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(SupabaseJwtVerifier) private readonly verifier: SupabaseJwtVerifier,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [context.getHandler(), context.getClass()]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest<AuthedRequest>();
    const header = req.headers.authorization ?? '';
    const match = /^Bearer\s+(\S+)$/i.exec(header);
    if (!match) throw new UnauthorizedException({ code: 'FH_NOT_AUTHENTICATED', message: 'Missing bearer token' });

    try {
      req.user = await this.verifier.verify(match[1]!);
      return true;
    } catch (error) {
      const message = error instanceof InvalidTokenError ? error.message : 'Invalid token';
      throw new UnauthorizedException({ code: 'FH_NOT_AUTHENTICATED', message });
    }
  }
}

export const CurrentUser = createParamDecorator((_: unknown, context: ExecutionContext): AuthUser => {
  const req = context.switchToHttp().getRequest<AuthedRequest>();
  if (!req.user) throw new UnauthorizedException({ code: 'FH_NOT_AUTHENTICATED', message: 'Not signed in' });
  return req.user;
});
