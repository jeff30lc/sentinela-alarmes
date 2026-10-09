import { getConnectionString } from '@netlify/database';
import pg from 'pg';
import { createHandler } from '../../app/lib/server';
import { PostgresDatabase } from '../lib/postgres';

let database: PostgresDatabase | undefined;
export default async function api(request: Request, context: { ip?: string } = {}) {
  try {
    if(!database){database = new PostgresDatabase(new pg.Pool({
      connectionString: getConnectionString(),
      max: 2, connectionTimeoutMillis: 15000, idleTimeoutMillis: 30000,
      statement_timeout: 15000, allowExitOnIdle: true,
    }));
    database.pool.on('error', error => console.error('Sentinela idle database connection', { code: (error as any).code ?? 'connection' }));
    }
    return await createHandler(database, {
      requireSetupToken: true,
      setupToken: process.env.SENTINELA_SETUP_TOKEN,
      // A trusted function context supplies the client IP.
      clientIP: context.ip ?? 'netlify',
    })(request);
  } catch (error: any) {
    // Driver messages may contain connection strings. Log only an error code.
    console.error('Sentinela database unavailable', { code: error?.code ?? 'configuration' });
    return new Response(JSON.stringify({ error: 'Banco indisponível. Contate o administrador.' }), {
      status: 503, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  }
}
export const config = { path: '/api/*' };

// Releases resources in local integration tests and graceful shutdowns.
export async function closeDatabase(){const current=database;database=undefined;await current?.pool.end();}
