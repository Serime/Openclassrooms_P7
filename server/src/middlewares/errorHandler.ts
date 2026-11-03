import { NextFunction, Request, Response } from 'express';
import { logger } from '../logger';

type HttpError = Error & { status?: number };

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ error: 'Route not found' });
}

export function errorHandler(err: HttpError, req: Request, res: Response, _next: NextFunction): void {
  const isClientError = err.status !== undefined && err.status >= 400 && err.status < 500;

  if (isClientError) {
    res.status(err.status as number).json({ error: 'Invalid request' });
    return;
  }

  logger.error('unhandled_error', {
    error: { name: err.name, message: err.message, stack: err.stack },
    http: { method: req.method, path: req.originalUrl.split('?')[0] },
  });
  res.status(500).json({ error: 'Internal server error' });
}
