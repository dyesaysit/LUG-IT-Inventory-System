import type { Request, Response, NextFunction } from 'express';
import type { EnvConfig } from '../config';

/** Custom error class for the application. */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

/**
 * Creates a global error-handling middleware.
 *
 * In production the response body hides stack traces and only
 * returns a generic message for unexpected errors.  In development
 * the full error message is included.
 *
 * @param config - Validated application configuration.
 * @returns An Express error-handling middleware function.
 */
export function createErrorHandler(config: EnvConfig) {
  return (
    err: Error,
    _req: Request,
    res: Response,
    _next: NextFunction,
  ): void => {
    const isProduction = config.NODE_ENV === 'production';

    if (err instanceof AppError) {
      res.status(err.statusCode).json({
        success: false,
        error: err.message,
      });
      return;
    }

    console.error('Unhandled error:', err);
    res.status(500).json({
      success: false,
      error: isProduction ? 'Internal server error' : err.message,
    });
  };
}