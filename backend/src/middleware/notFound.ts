import type { Request, Response } from 'express';
import { AppError } from './errorHandler';

/**
 * Not-found middleware.
 *
 * Catches requests that don't match any registered route and
 * returns a consistent 404 JSON response.
 */
export function notFound(_req: Request, _res: Response): void {
  throw new AppError('Not found', 404);
}