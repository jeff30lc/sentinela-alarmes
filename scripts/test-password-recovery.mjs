import {build} from 'esbuild';
import {readFileSync} from 'node:fs';
import {Miniflare} from 'miniflare';
import {NetlifyDB} from '@netlify/database-dev';
import pg from 'pg';
import {verifyPasswordRecovery} from './verify-password-recovery.mjs';
await build({entryPoints:['app/lib/server.ts'],outfile:'.sites-runtime/recovery-handler.mjs',bundle:true,platform:'node',format:'esm',packages:'external'});
await build({entryPoints:['netlify/lib/postgres.ts'],outfile:'.sites-runtime/recovery-postgres.mjs',bundle:true,platform:'node',format:'esm',packages:'external'});
const {createHandler}=await import('../.sites-runtime/recovery-handler.mjs');const {PostgresDatabase}=await import('../.sites-runtime/recovery-postgres.mjs');
const local=new NetlifyDB({logger:()=>{}});let pool;try{const url=await local.start();await local.applyMigrations('netlify/database/migrations');pool=new pg.Pool({connectionString:url});await verifyPasswordRecovery(new PostgresDatabase(pool),createHandler);}finally{if(pool)await pool.end();await local.stop();}
const mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("ok")}}',d1Databases:['DB']});try{const database=await mf.getD1Database('DB');for(const file of ['drizzle/0000_ambitious_yellowjacket.sql','drizzle/0001_password_recovery.sql']){const sql=readFileSync(file,'utf8').replaceAll('--> statement-breakpoint','');await database.batch(sql.split(';').filter(s=>s.trim()).map(s=>database.prepare(s)));}await verifyPasswordRecovery(database,createHandler);}finally{await mf.dispose();}
