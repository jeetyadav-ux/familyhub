import { extractErrorCode, friendlyErrorMessage, type ErrorCode } from '@familyhub/shared';
import { supabase } from './supabase';

/** Error with a user-facing message and, when available, the FH_ code from the database. */
export class AppError extends Error {
  constructor(
    message: string,
    readonly code: ErrorCode | null,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  return new AppError(friendlyErrorMessage(error), extractErrorCode(error));
}

/** Calls a Postgres RPC; RLS and the function's own checks decide what is allowed. */
export async function rpc<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw toAppError(error);
  return data as T;
}

/** Unwraps a Supabase query result. */
export function unwrap<T>(result: { data: unknown; error: unknown }): T {
  if (result.error) throw toAppError(result.error);
  return result.data as T;
}

export function errorMessage(error: unknown): string {
  return toAppError(error).message;
}
