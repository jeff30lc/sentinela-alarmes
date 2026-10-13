import type { HandlerOptions } from './database';
type Environment = Record<string, string | undefined>;
export const recoverySubject = 'Sentinela — redefinição de senha';
export const recoveryText = (url:string) => 'Recebemos uma solicitação para redefinir sua senha no Sentinela.\n\nAbra o link abaixo para escolher uma nova senha:\n'+url+'\n\nEste link expira em 15 minutos e pode ser usado uma única vez. Se você não solicitou a alteração, ignore esta mensagem. Sua senha atual continua válida.\n\nAXIA SUL · Sentinela';
export function createHttpRecoveryDelivery(env: Environment): HandlerOptions['recovery'] {
 if(!env.RESEND_API_KEY||!env.MAIL_FROM||!env.APP_ORIGIN)return undefined;
 return {origin:env.APP_ORIGIN,send:async ({to,url})=>{
  const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+env.RESEND_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({from:env.MAIL_FROM,to:[to],subject:recoverySubject,text:recoveryText(url)}),signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw new Error('Email delivery unavailable');
 }};
}
