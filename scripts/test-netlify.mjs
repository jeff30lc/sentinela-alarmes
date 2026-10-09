// Disposable local Postgres + the real Netlify function. No production access.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { NetlifyDB } from '@netlify/database-dev';
import { build } from 'esbuild';
import pg from 'pg';

const local = new NetlifyDB({ logger: () => {} });
let server, pool, closeDatabase;
const originalURL = process.env.NETLIFY_DB_URL;
const originalToken = process.env.SENTINELA_SETUP_TOKEN;
const setupToken = crypto.randomUUID() + crypto.randomUUID();
try {
  process.env.NETLIFY_DB_URL = await local.start();
  process.env.SENTINELA_SETUP_TOKEN = setupToken;
  await local.applyMigrations('netlify/database/migrations');
  await build({
    entryPoints: ['netlify/functions/api.mts'], outfile: '.sites-runtime/netlify-api-test.mjs',
    bundle: true, platform: 'node', target: 'node22', format: 'esm', packages: 'external',
  });
  await build({entryPoints:['netlify/lib/postgres.ts'],outfile:'.sites-runtime/netlify-postgres-test.mjs',bundle:true,platform:'node',target:'node22',format:'esm',packages:'external'});
  const module = await import('../.sites-runtime/netlify-api-test.mjs');
  const { default: api, config } = module;
  closeDatabase=module.closeDatabase;
  assert.equal(config.path, '/api/*');
  pool = new pg.Pool({ connectionString: process.env.NETLIFY_DB_URL });
  const { PostgresDatabase } = await import('../.sites-runtime/netlify-postgres-test.mjs');
  const database = new PostgresDatabase(pool);
  // A failed audit write must roll back the complete batch.
  await assert.rejects(database.batch([
    database.prepare('INSERT INTO settings(key,value) VALUES(?,?)').bind('rollback', 'one'),
    database.prepare('INSERT INTO settings(key,value) VALUES(?,?)').bind('rollback', 'two'),
  ]));
  assert.equal((await pool.query('SELECT * FROM settings')).rows.length, 0);
  const origin = 'https://sentinela-test.example';
  async function direct(path, body, cookie) {
    return api(new Request(origin+'/api/'+path, {
      method: body ? 'POST' : 'GET',
      headers: { ...(body ? { 'Content-Type':'application/json', 'X-App-Request':'sentinela', Origin:origin } : {}), ...(cookie ? { Cookie:cookie } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    }), { ip:'127.0.0.1' });
  }
  const initial = await (await direct('session')).json();
  assert.equal(initial.setupTokenRequired, true);
  const credentials = { name:'Netlify QA Admin', username:'netlify.qa', password:crypto.randomUUID(), setupToken };
  delete process.env.SENTINELA_SETUP_TOKEN;
  assert.equal((await direct('setup', credentials)).status, 503);
  process.env.SENTINELA_SETUP_TOKEN = setupToken;
  assert.equal((await direct('setup', { ...credentials, setupToken:'invalid-key-1234567' })).status, 403);
  assert.equal((await pool.query('SELECT * FROM users')).rows.length, 0);

  server = createServer(async (incoming, outgoing) => {
    try {
      const chunks=[];
      for await (const chunk of incoming) chunks.push(chunk);
      const body=Buffer.concat(chunks);
      const url='http://127.0.0.1:'+server.address().port+incoming.url;
      const response=await api(new Request(url, {
        method:incoming.method, headers:incoming.headers,
        body:body.length ? body : undefined,
      }), {ip:'127.0.0.1'});
      outgoing.writeHead(response.status,Object.fromEntries(response.headers));
      outgoing.end(Buffer.from(await response.arrayBuffer()));
    } catch (error) { outgoing.writeHead(500); outgoing.end('Local test harness failed'); console.error(error); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const testOrigin='http://127.0.0.1:'+server.address().port;
  await new Promise((resolve,reject) => {
    const child=spawn(process.execPath,['scripts/verify-flow.mjs'],{
      stdio:'inherit', env:{...process.env,SENTINELA_TEST_ORIGIN:testOrigin,SENTINELA_TEST_SETUP_TOKEN:setupToken},
    });
    child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(new Error('Flow checks failed')));
  });

  // Test HTTPS cookie flags and concurrent requests on the migrated backend.
  await direct('users', {}); // Anonymous access is rejected independently of the UI.
  await pool.query('DELETE FROM sessions');
  const password=crypto.randomUUID();
  // Create a fresh admin login through the normal password change-free setup hash.
  await pool.query('TRUNCATE sessions,requests,stations,users,events,settings,login_attempts CASCADE');
  assert.equal((await direct('setup',{...credentials,password})).status,200);
  const login=await direct('login',{username:credentials.username,password});
  const cookie=login.headers.get('set-cookie');
  assert.ok(cookie.includes('Secure')&&cookie.includes('HttpOnly')&&cookie.includes('SameSite=Strict'));
  const sessionCookie=cookie.split(';')[0];
  const data=await (await direct('data',undefined,sessionCookie)).json();
  const code=data.stations[0].code;
  await direct('initialize',{code,status:'inactive'},sessionCookie);
  const simultaneous=await Promise.all([
    direct('request',{code,target:'active',version:1},sessionCookie),
    direct('request',{code,target:'active',version:1},sessionCookie),
  ]);
  assert.deepEqual(simultaneous.map(r=>r.status).sort(),[200,409]);
  assert.equal((await pool.query("SELECT * FROM requests")).rows.length,1);
  assert.equal((await pool.query("SELECT * FROM events WHERE type='request'")).rows.length,1);
  const logs=await (await direct('logs',undefined,sessionCookie)).json();
  assert.equal(typeof logs.total,'number');
  // Existing installations can log in after the one-time setup secret is removed.
  delete process.env.SENTINELA_SETUP_TOKEN;
  assert.equal((await direct('login',{username:credentials.username,password})).status,200);
  assert.equal((await direct('setup',credentials)).status,409);
  assert.equal((await direct('users',{name:'Duplicate User',username:credentials.username,password,role:'operator'},sessionCookie)).status,409);
  assert.equal((await pool.query('SELECT * FROM users')).rows.length,1);
  console.log('Netlify checks passed: PostgreSQL migration, atomic rollback, setup key, HTTPS cookies, concurrent request/audit, numeric totals and unique conflicts.');
} finally {
  if(server)await new Promise(resolve=>server.close(resolve));
  if(closeDatabase)await closeDatabase();
  if(pool)await pool.end();
  await local.stop();
  if(originalURL===undefined)delete process.env.NETLIFY_DB_URL;else process.env.NETLIFY_DB_URL=originalURL;
  if(originalToken===undefined)delete process.env.SENTINELA_SETUP_TOKEN;else process.env.SENTINELA_SETUP_TOKEN=originalToken;
}
