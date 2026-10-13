import nodemailer from 'nodemailer';
import type { HandlerOptions } from '../app/lib/database';
import { createHttpRecoveryDelivery, recoverySubject, recoveryText } from '../app/lib/email';
type Environment = Record<string,string|undefined>;
export function createRecoveryDelivery(env:Environment):HandlerOptions['recovery']{
 const {SMTP_HOST,SMTP_USER,SMTP_PASSWORD,MAIL_FROM,APP_ORIGIN}=env;
 const port=Number(env.SMTP_PORT??465);
 if(!SMTP_HOST||!SMTP_USER||!SMTP_PASSWORD||!MAIL_FROM||!APP_ORIGIN||![465,587].includes(port))return createHttpRecoveryDelivery(env);
 const transport=nodemailer.createTransport({host:SMTP_HOST,port,secure:port===465,requireTLS:port===587,auth:{user:SMTP_USER,pass:SMTP_PASSWORD},connectionTimeout:10000,greetingTimeout:10000,socketTimeout:15000,tls:{minVersion:'TLSv1.2'}});
 return {origin:APP_ORIGIN,send:async ({to,url})=>{await transport.sendMail({from:MAIL_FROM,to,subject:recoverySubject,text:recoveryText(url),disableFileAccess:true,disableUrlAccess:true});}};
}
