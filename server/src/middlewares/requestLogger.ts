import { NextFunction, Request, Response } from 'express';
import { logger } from '../logger';

const UUID_PATTERN = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

export function normalizePath(url: string): string {
  return url.split('?')[0].replace(UUID_PATTERN, ':id');
}

export function levelForStatus(statusCode: number): 'error' | 'warn' | 'info' {
  if (statusCode >= 500) {
    return 'error';
  }
  if (statusCode >= 400) {
    return 'warn';
  }
  return 'info';
}

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = process.hrtime.bigint();
  const path = normalizePath(req.originalUrl);

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
    logger.log(levelForStatus(res.statusCode), 'http_request', {
      http: {
        method: req.method,
        path,
        status_code: res.statusCode,
        duration_ms: Math.round(durationMs * 100) / 100,
      },
    });
  });

  next();
}
