import { app } from './app.js';
import { env } from './config/env.js';
import { connectDatabase, closeDatabase } from './config/database.js';
import { logger } from './lib/logger.js';
import { startHeartbeat } from './lib/heartbeat.js';
import { ensureIndexes } from './models/index.js';
try {
  await connectDatabase();
  await ensureIndexes();
  let stopHeartbeat = () => {};
  const server = app.listen(env.PORT, env.HOST, () => {
    logger.info({ port: env.PORT }, 'Forma API ready');
    stopHeartbeat = startHeartbeat();
  });
  let closing = false;
  const shutdown = () => {
    if (closing) return;
    closing = true;
    stopHeartbeat();
    const timeout = setTimeout(() => process.exit(1), 10000).unref();
    server.close(() => {
      void closeDatabase().then(() => {
        clearTimeout(timeout);
        process.exit(0);
      });
    });
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
} catch (error) {
  logger.fatal({ err: error }, 'API startup failed');
  await closeDatabase();
  process.exitCode = 1;
}
