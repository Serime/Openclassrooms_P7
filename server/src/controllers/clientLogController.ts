import { Request, Response } from 'express';
import { ClientLogSchema } from '../models/clientLogModel';
import { logger } from '../logger';

export const clientLogController = {
  create(req: Request, res: Response): void {
    const result = ClientLogSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: 'Invalid input data' });
      return;
    }

    const { level, ...client } = result.data;
    logger.log(level, 'client_log', { origin: 'browser', client });
    res.status(204).send();
  },
};
