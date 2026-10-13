import { env } from 'cloudflare:workers';
import { createHandler } from '../../lib/server';
import { createHttpRecoveryDelivery } from '../../lib/email';
export const dynamic='force-dynamic';
const handle = (request: Request) => createHandler(env.DB,{recovery:createHttpRecoveryDelivery(env as unknown as Record<string,string|undefined>)})(request);
export const GET=handle;
export const POST=handle;
