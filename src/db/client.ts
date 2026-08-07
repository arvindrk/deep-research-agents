import { neon, type NeonQueryFunction } from '@neondatabase/serverless';

let client: NeonQueryFunction<false, false> | null = null;

/**
 * Resolves DATABASE_URL on first use rather than at import time, so importing
 * this module stays side-effect free and `next build` succeeds without secrets.
 */
export function getDBClient(): NeonQueryFunction<false, false> {
  if (!client) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    client = neon(connectionString);
  }
  return client;
}
