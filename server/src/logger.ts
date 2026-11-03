import winston from 'winston';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL ?? 'info',
  defaultMeta: { service: 'orion-crm-server' },
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  transports: [new winston.transports.Console({ silent: process.env.NODE_ENV === 'test' })],
});
