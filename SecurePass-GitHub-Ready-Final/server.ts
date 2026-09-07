import express from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import { createServer as createViteServer } from 'vite';
import { config } from './server/config/env';
import { initDatabase } from './server/database/db';
import { initRedis } from './server/database/redis';
import apiRouter from './server/routes/index';
import { errorHandler } from './server/middleware/errorHandler';

async function startServer() {
  const app = express();
  const PORT = config.port;

  // Initialize data persistence and cache systems
  await initDatabase();
  await initRedis();

  // Security headers using Helmet
  // Configured to permit Vite scripts & inline assets in dev/iframe
  app.use(
    helmet({
      contentSecurityPolicy: false, // Let Vite handle CSP during development and iframe embed
      crossOriginEmbedderPolicy: false,
    })
  );

  // CORS Configuration
  app.use(
    cors({
      origin: true,
      credentials: true,
    })
  );

  // Request body parsing with strict size limits
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // Mount REST API routes first
  app.use('/api', apiRouter);

  // Centralized error handling
  app.use(errorHandler);

  // Vite middleware for development & static serving for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        host: '0.0.0.0',
        port: 3000,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[SecurePass] Server active on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[SecurePass] Fatal server startup error:', err);
  process.exit(1);
});
