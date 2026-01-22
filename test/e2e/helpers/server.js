// test/e2e/helpers/server.js
// Vite server lifecycle management using programmatic API
// Source: 13-RESEARCH.md Pattern 2, Vite JavaScript API docs
import { createServer } from 'vite';

let server = null;
const PORT = 5174;  // Use different port than dev (5173) to avoid conflicts
const BASE_URL = `http://localhost:${PORT}`;

/**
 * Start Vite dev server
 * @returns {Promise<void>}
 */
export async function startServer() {
  if (server) {
    throw new Error('Server already running');
  }

  server = await createServer({
    server: { port: PORT, strictPort: true },
    logLevel: 'error'  // Suppress logs in tests
  });

  await server.listen();

  console.log(`[Server] Vite dev server running at ${BASE_URL}`);
}

/**
 * Stop Vite dev server
 * @returns {Promise<void>}
 */
export async function stopServer() {
  if (!server) return;

  await server.close();
  server = null;

  console.log('[Server] Vite dev server stopped');
}

/**
 * Get base URL for tests
 * @returns {string}
 */
export function getBaseUrl() {
  return BASE_URL;
}

/**
 * Get server port
 * @returns {number}
 */
export function getPort() {
  return PORT;
}

/**
 * Check if server is running
 * @returns {boolean}
 */
export function isRunning() {
  return server !== null;
}

/**
 * Restart server (stop and start)
 * @returns {Promise<void>}
 */
export async function restartServer() {
  await stopServer();
  await startServer();
}

/**
 * Wait for server to be ready by checking URL
 * @param {number} maxWait - Maximum wait time in ms (default 10000)
 * @param {number} interval - Check interval in ms (default 200)
 * @returns {Promise<void>}
 */
export async function waitForReady(maxWait = 10000, interval = 200) {
  const start = Date.now();

  while (Date.now() - start < maxWait) {
    try {
      const response = await fetch(BASE_URL);
      if (response.ok) {
        return;
      }
    } catch {
      // Server not ready yet
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }

  throw new Error(`Server not ready after ${maxWait}ms`);
}

// Cleanup handlers for unexpected exit
process.on('exit', () => {
  if (server) {
    server.close().catch(() => {});
  }
});

process.on('SIGINT', async () => {
  await stopServer();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await stopServer();
  process.exit(0);
});

// Handle uncaught exceptions to ensure cleanup
process.on('uncaughtException', async (err) => {
  console.error('[Server] Uncaught exception:', err);
  await stopServer();
  process.exit(1);
});

process.on('unhandledRejection', async (reason) => {
  console.error('[Server] Unhandled rejection:', reason);
  await stopServer();
  process.exit(1);
});
