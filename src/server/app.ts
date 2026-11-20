import express, { type Express } from 'express';
import { errorHandler, noStore, notFound, requireAdmin, sameOrigin } from './middleware';
import { adminRouter } from './routes/admin';
import { authRouter } from './routes/auth';
import { cronRouter } from './routes/cron';
import { publicRouter } from './routes/public';

/**
 * API da SR Burguer em Express 5, montada dentro de uma API Route do Next.js
 * (src/pages/api/[[...route]].ts). Express 5 encaminha erros de handlers async ao errorHandler.
 */
export function createApp(): Express {
  const app = express();
  app.disable('x-powered-by');
  app.set('etag', false);
  app.use(express.json({ limit: '1.5mb' }));
  app.use(sameOrigin);

  app.use('/api/auth', authRouter);
  app.use('/api/admin', noStore, requireAdmin, adminRouter);
  app.use('/api/cron', noStore, cronRouter);
  app.use('/api', publicRouter);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}

let instance: Express | null = null;

export function getApp(): Express {
  instance ??= createApp();
  return instance;
}
