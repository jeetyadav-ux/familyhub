import { Catch, HttpException, HttpStatus, Logger, type ArgumentsHost, type ExceptionFilter } from '@nestjs/common';
import type { Response } from 'express';
import { ERROR_MESSAGES, isErrorCode } from '@familyhub/shared';
import { DataAccessError } from '../supabase/supabase.service.js';

/** Status code for database error codes raised by RPCs. */
const STATUS_FOR_CODE: Record<string, number> = {
  FH_NOT_AUTHENTICATED: HttpStatus.UNAUTHORIZED,
  FH_NOT_AUTHORIZED: HttpStatus.FORBIDDEN,
  FH_REAUTH_REQUIRED: HttpStatus.FORBIDDEN,
  FH_RATE_LIMITED: HttpStatus.TOO_MANY_REQUESTS,
  FH_MEMBER_NOT_FOUND: HttpStatus.NOT_FOUND,
};

/**
 * Every error leaves the API as `{ error: { code, message } }`. Internal details
 * (stack traces, SQL messages) are logged, never returned.
 */
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ApiExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();
    const { status, code, message } = this.describe(exception);
    if (status >= 500) this.logger.error(exception instanceof Error ? exception.stack : String(exception));
    res.status(status).json({ error: { code, message } });
  }

  private describe(exception: unknown): { status: number; code: string; message: string } {
    if (exception instanceof DataAccessError) {
      if (exception.code && isErrorCode(exception.code)) {
        return {
          status: STATUS_FOR_CODE[exception.code] ?? HttpStatus.BAD_REQUEST,
          code: exception.code,
          message: ERROR_MESSAGES[exception.code],
        };
      }
      return { status: HttpStatus.BAD_GATEWAY, code: 'FH_UPSTREAM_ERROR', message: 'The data service failed to respond.' };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      if (body && typeof body === 'object' && 'code' in body) {
        const b = body as { code: string; message?: string };
        return { status, code: b.code, message: b.message ?? exception.message };
      }
      const fallbackCode =
        status === 404 ? 'FH_NOT_FOUND' : status === 429 ? 'FH_RATE_LIMITED' : status < 500 ? 'FH_BAD_REQUEST' : 'FH_INTERNAL';
      return { status, code: fallbackCode, message: exception.message };
    }

    return { status: HttpStatus.INTERNAL_SERVER_ERROR, code: 'FH_INTERNAL', message: 'Something went wrong.' };
  }
}
