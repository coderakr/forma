import { env } from '../config/env.js';
import { logger } from './logger.js';

const intervalMs = 14 * 60 * 1000;
const timeoutMs = 10_000;

/** Best-effort public HTTP traffic while this process is running. */
export function startHeartbeat(): () => void {
  if (!env.HEARTBEAT_ENABLED) return () => {};

  const url = new URL('/health', env.BETTER_AUTH_URL);
  let active: AbortController | undefined;
  const ping = async () => {
    if (active) return;
    const controller = new AbortController();
    active = controller;
    const timeout = setTimeout(() => controller.abort(), timeoutMs).unref();
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        redirect: 'error',
        cache: 'no-store',
      });
      await response.body?.cancel();
      if (response.ok) logger.info({ status: response.status }, 'Heartbeat succeeded');
      else logger.warn({ status: response.status }, 'Heartbeat returned an unhealthy response');
    } catch (error) {
      logger.warn({ err: error }, 'Heartbeat failed');
    } finally {
      clearTimeout(timeout);
      active = undefined;
    }
  };

  const timer = setInterval(() => void ping(), intervalMs).unref();
  logger.info({ intervalMinutes: 14 }, 'Heartbeat enabled');
  return () => {
    clearInterval(timer);
    active?.abort();
  };
}
