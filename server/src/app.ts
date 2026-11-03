import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import organizationRoutes from './routes/organizationRoutes';
import contactRoutes from './routes/contactRoutes';
import clientLogRoutes from './routes/clientLogRoutes';
import { requestLogger } from './middlewares/requestLogger';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler';

export const app: Application = express();

app.use(requestLogger);
app.use(cors());
app.use(express.json());

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'OK', message: 'Orion CRM API is running' });
});

app.use('/api/organizations', organizationRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/client-logs', clientLogRoutes);

app.use(notFoundHandler);
app.use(errorHandler);
