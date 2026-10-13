import express from 'express';
import mysql from 'mysql2/promise';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createHandler } from '../app/lib/server';
import { MySQLDatabase } from './mysql';
import { createRecoveryDelivery } from './mail';

export async function createApplication(pool: mysql.Pool, options: { publicDirectory?: string; origin?: string; setupToken?: string } = {}) {
  const schema = await readFile(new URL('./schema.sql', import.meta.url), 'utf8');
  // Idempotent, additive schema setup. Never drops tables or operational records.
  for (const statement of schema.split(';').map(value => value.trim()).filter(Boolean)) await pool.query(statement);
  const database = new MySQLDatabase(pool);
  const recovery=createRecoveryDelivery({...process.env,APP_ORIGIN:options.origin||process.env.APP_ORIGIN});
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use((_request, response, next) => {
    response.set({ 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'same-origin', 'X-Frame-Options': 'DENY' });
    next();
  });
  app.use('/api', express.raw({ type: () => true, limit: '64kb' }), async (incoming, outgoing) => {
    try {
      const origin = options.origin || process.env.APP_ORIGIN;
      if (!origin) throw new Error('APP_ORIGIN is required');
      const headers = new Headers();
      for (const [key, value] of Object.entries(incoming.headers)) {
        if (value !== undefined) headers.set(key, Array.isArray(value) ? value.join(', ') : value);
      }
      const body = incoming.body as Buffer | undefined;
      const response = await createHandler(database, {
        recovery,
        requireSetupToken: true,
        setupToken: options.setupToken ?? process.env.SENTINELA_SETUP_TOKEN,
        clientIP: incoming.ip ?? 'hostinger',
      })(new Request(new URL(incoming.originalUrl, origin), {
        method: incoming.method, headers,
        body: !['GET', 'HEAD'].includes(incoming.method) && body?.length ? new Uint8Array(body) : undefined,
      }));
      outgoing.status(response.status);
      response.headers.forEach((value, key) => outgoing.setHeader(key, value));
      outgoing.end(Buffer.from(await response.arrayBuffer()));
    } catch (error: any) {
      console.error('Sentinela request failed', { code: error?.code ?? 'configuration' });
      outgoing.status(503).set('Cache-Control', 'no-store').json({ error: 'Banco indisponível. Contate o administrador.' });
    }
  });
  const publicDirectory = options.publicDirectory ?? fileURLToPath(new URL('./public', import.meta.url));
  app.use(express.static(publicDirectory, { setHeaders: (response, path) => {
    response.setHeader('Cache-Control', path.endsWith('index.html') ? 'no-cache' : 'public, max-age=3600');
  } }));
  app.get('/{*path}', (_request, response) => response.set('Cache-Control', 'no-cache').sendFile(publicDirectory + '/index.html'));
  app.use((error: any, _request: any, response: any, _next: any) => {
    response.status(error?.type === 'entity.too.large' ? 413 : 400).set('Cache-Control', 'no-store').json({ error: 'Dados inválidos.' });
  });
  return { app, database };
}

async function start() {
  for (const name of ['MYSQL_DATABASE', 'MYSQL_USER', 'MYSQL_PASSWORD', 'APP_ORIGIN']) {
    if (!process.env[name]) throw new Error('Missing server configuration: ' + name);
  }
  const pool = mysql.createPool({
    host: process.env.MYSQL_HOST ?? '127.0.0.1', port: Number(process.env.MYSQL_PORT ?? 3306),
    user: process.env.MYSQL_USER, password: process.env.MYSQL_PASSWORD, database: process.env.MYSQL_DATABASE,
    charset: 'utf8mb4', connectionLimit: 5, connectTimeout: 15000,
    supportBigNumbers: true, bigNumberStrings: false,
  });
  const { app } = await createApplication(pool);
  const server = app.listen(Number(process.env.PORT ?? 3000), '0.0.0.0', () => console.log('Sentinela server ready'));
  const shutdown = () => server.close(() => void pool.end().finally(() => process.exit(0)));
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}
if (process.env.SENTINELA_TEST_MODE !== '1') start().catch((error: any) => {
  console.error('Sentinela startup failed', { code: error?.code ?? 'configuration' });
  process.exitCode = 1;
});

export { createHandler };
