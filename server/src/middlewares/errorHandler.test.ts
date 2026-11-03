import { Request, Response } from 'express';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { errorHandler } from './errorHandler';
import { logger } from '../logger';

function fakeResponse(): Response {
  const res = { status: vi.fn(), json: vi.fn() };
  res.status.mockReturnValue(res);
  return res as unknown as Response;
}

const req = { method: 'POST', originalUrl: '/api/contacts?draft=1' } as Request;

describe('errorHandler', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('logs unexpected errors and answers 500', () => {
    const error = vi.spyOn(logger, 'error').mockReturnValue(logger);
    const res = fakeResponse();

    errorHandler(new Error('database unavailable'), req, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(500);
    expect(error).toHaveBeenCalledWith(
      'unhandled_error',
      expect.objectContaining({
        error: expect.objectContaining({ message: 'database unavailable' }),
        http: { method: 'POST', path: '/api/contacts' },
      }),
    );
  });

  it('keeps the status of client errors without logging them as failures', () => {
    const error = vi.spyOn(logger, 'error').mockReturnValue(logger);
    const res = fakeResponse();

    errorHandler(Object.assign(new Error('entity too large'), { status: 413 }), req, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(413);
    expect(error).not.toHaveBeenCalled();
  });
});
