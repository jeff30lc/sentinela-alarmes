import { cp, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const destination = resolve(root, 'outputs/hostinger/source');
await mkdir(destination, { recursive: true });
for (const name of ['app/PasswordRecovery.tsx','app/lib/email.ts', 'app/page.tsx', 'app/globals.css', 'app/stations.json', 'app/lib/server.ts', 'app/lib/database.ts', 'netlify/client', 'public', 'scripts/verify-password-recovery.mjs','scripts/verify-flow.mjs']) {
  await mkdir(resolve(destination, name, '..'), { recursive: true });
  await cp(resolve(root, name), resolve(destination, name), { recursive: true });
}
for (const name of ['mail.ts','build.mjs', 'mysql.ts', 'server.ts', 'schema.sql', 'test.mjs']) {
  await mkdir(resolve(destination, 'hostinger'), { recursive: true });
  await cp(resolve(root, 'hostinger', name), resolve(destination, 'hostinger', name));
}
for (const name of ['package.json', 'package-lock.json']) {
  await cp(resolve(root, 'hostinger', name), resolve(destination, name));
}
await writeFile(resolve(destination, '.gitignore'), '/node_modules/\n/dist/\n.env*\n');
console.log('Hostinger source prepared:', destination);
