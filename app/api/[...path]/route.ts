import { env } from 'cloudflare:workers';
import { createHandler } from '../../lib/server';
export const dynamic='force-dynamic';
const handle = (request: Request) => createHandler(env.DB)(request);
export const GET=handle;
export const POST=handle;
