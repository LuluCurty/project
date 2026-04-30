import pino from 'pino';
import { join } from 'node:path';

const isDev = process.env.NODE_ENV !== 'production';

// In dev, pino.transport() uses worker threads that Vite's SSR runner can't resolve.
// Write plain JSON to stdout instead — pipe through `npx pino-pretty` if needed.
// In production (adapter-node), use daily rotating file transport.
const logger = isDev
    ? pino({ level: 'info' })
    : pino(
          { level: 'info' },
          pino.transport({
              target: 'pino-roll',
              options: {
                  file: join(process.cwd(), 'logs', 'app.log'),
                  frequency: 'daily',
                  mkdir: true,
              },
          })
      );

export default logger;

export const authLog    = logger.child({ module: 'auth' });
export const supplyLog  = logger.child({ module: 'supplies' });
export const settingLog = logger.child({ module: 'settings' });
