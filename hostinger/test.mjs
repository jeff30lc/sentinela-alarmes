import assert from 'node:assert/strict';
import { verifyPasswordRecovery } from '../scripts/verify-password-recovery.mjs';
import mysql from 'mysql2/promise';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

if (process.env.MYSQL_HOST !== '127.0.0.1' || !/^sentinela_test_[a-z0-9]+$/.test(process.env.MYSQL_DATABASE ?? '')) {
  throw new Error('Tests require a disposable local database');
}
process.env.SENTINELA_TEST_MODE = '1';
const pool = mysql.createPool({
  host: '127.0.0.1', port: Number(process.env.MYSQL_PORT), user: 'root',
  database: process.env.MYSQL_DATABASE, charset: 'utf8mb4', connectionLimit: 5,
});
const setupToken = crypto.randomUUID() + crypto.randomUUID();
let server;
try {
  const { createApplication, createHandler } = await import('../dist/hostinger/server.mjs');
  const { app, database } = await createApplication(pool, { origin: 'https://sentinela-test.example', setupToken });
  // All statements, including failed writes, must commit or roll back together.
  await assert.rejects(database.batch([
    database.prepare('INSERT INTO settings(key,value) VALUES(?,?)').bind('rollback', 'one'),
    database.prepare('INSERT INTO settings(key,value) VALUES(?,?)').bind('rollback', 'two'),
  ]));
  assert.equal((await pool.query('SELECT * FROM settings'))[0].length, 0);
  server = await new Promise(resolve => {
    const running = app.listen(0, '127.0.0.1', () => resolve(running));
  });
  const origin = 'http://127.0.0.1:' + server.address().port;
  // The adapter builds trusted HTTPS URLs behind Hostinger's reverse proxy.
  async function direct(path, body, cookie, custom = {}) {
    return fetch(origin + '/api/' + path, {
      method: body ? 'POST' : 'GET',
      headers: {
        ...(body ? { 'Content-Type': 'application/json', 'X-App-Request': 'sentinela', Origin: 'https://sentinela-test.example' } : {}),
        ...(cookie ? { Cookie: cookie } : {}), ...custom,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  }
  assert.equal((await (await direct('session')).json()).setupTokenRequired, true);
  const credentials = { name: 'Hostinger QA Admin', username: 'hostinger.qa', password: crypto.randomUUID(), setupToken };
  assert.equal((await direct('setup', { ...credentials, setupToken: 'invalid-key-1234567' })).status, 403);
  assert.equal((await direct('setup', credentials)).status, 200);
  const login = await direct('login', credentials);
  assert.equal(login.status, 200);
  const cookie = login.headers.get('set-cookie');
  assert.ok(cookie.includes('Secure') && cookie.includes('HttpOnly') && cookie.includes('SameSite=Strict'));
  const sessionCookie = cookie.split(';')[0];
  const data = await (await direct('data', undefined, sessionCookie)).json();
  assert.equal(data.stations.length, 79);
  const code = data.stations[0].code;
  await direct('initialize', { code, status: 'inactive' }, sessionCookie);
  const simultaneous = await Promise.all([
    direct('request', { code, target: 'active', version: 1 }, sessionCookie),
    direct('request', { code, target: 'active', version: 1 }, sessionCookie),
  ]);
  assert.deepEqual(simultaneous.map(response => response.status).sort(), [200, 409]);
  assert.equal((await pool.query('SELECT * FROM requests'))[0].length, 1);
  assert.equal((await pool.query("SELECT * FROM events WHERE type='request'"))[0].length, 1);
  assert.equal(typeof (await (await direct('logs', undefined, sessionCookie)).json()).total, 'number');
  assert.equal((await direct('users', { name: 'Duplicate User', username: credentials.username, password: credentials.password, role: 'operator' }, sessionCookie)).status, 409);
  assert.equal((await pool.query('SELECT * FROM users'))[0].length, 1);
  assert.equal((await direct('login', credentials, undefined, { Origin: 'https://invalid.example' })).status, 403);
  assert.equal((await direct('login', { username: 'absent', password: 'incorrect' })).status, 401);
  assert.equal((await direct('login', { username: 'absent', password: 'incorrect' })).status, 401);
  assert.equal((await pool.query('SELECT count FROM login_attempts'))[0][0].count, 2);
  assert.equal((await direct('login', credentials, undefined, { 'Content-Type': 'application/json', 'X-Large-Test': 'test' })).status, 200);
  // Recreating the application must preserve users, requests, sessions and history.
  await createApplication(pool, { origin: 'https://sentinela-test.example', setupToken });
  assert.equal((await (await direct('session')).json()).initialized, true);
  assert.equal((await pool.query('SELECT * FROM requests'))[0].length, 1);
  for (const table of ['user_recovery', 'events', 'sessions', 'requests', 'stations', 'users', 'settings', 'login_attempts']) await pool.query('DELETE FROM `' + table + '`');
  await new Promise(resolve => server.close(resolve));
  server = undefined;
  const flowApp = await createApplication(pool, { setupToken });
  server = await new Promise(resolve => { const running = flowApp.app.listen(0, '127.0.0.1', () => resolve(running)); });
  // Use the exact local origin so the existing complete workflow suite checks CSRF too.
  process.env.APP_ORIGIN = 'http://127.0.0.1:' + server.address().port;
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['scripts/verify-flow.mjs'], {
      cwd: fileURLToPath(new URL('../', import.meta.url)), stdio: 'inherit',
      env: { ...process.env, SENTINELA_TEST_ORIGIN: process.env.APP_ORIGIN, SENTINELA_TEST_SETUP_TOKEN: setupToken },
    });
    child.on('error', reject);
    child.on('exit', code => code === 0 ? resolve() : reject(new Error('Workflow checks failed')));
  });
  const page = await fetch(process.env.APP_ORIGIN + '/');
  assert.equal(page.status, 200);
  assert.ok((await page.text()).includes('Sentinela'));
  assert.equal((await fetch(process.env.APP_ORIGIN + '/api/data')).status, 401);
  for (const table of ['user_recovery','events','sessions','requests','stations','users','settings','login_attempts']) await pool.query('DELETE FROM `'+table+'`');
  await verifyPasswordRecovery(database,createHandler);
  console.log('Hostinger checks passed: MySQL migration, rollback, concurrent writes, setup token, HTTPS cookies, persistence, duplicate conflicts and complete workflow.');
} finally {
  if (server) await new Promise(resolve => server.close(resolve));
  await pool.end();
}
