'use client';
import { useState, type FormEvent } from 'react';
import { ArrowLeft, CheckCheck, Loader2, Mail } from 'lucide-react';

type Props = { token: string; available: boolean; submit: (path: string, body: any) => Promise<any>; back: () => void };
export default function PasswordRecovery({ token, available, submit, back }: Props) {
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState(''),[done,setDone]=useState(false);
 async function send(event:FormEvent<HTMLFormElement>){event.preventDefault();setBusy(true);setError('');const values=Object.fromEntries(new FormData(event.currentTarget));try{
  if(token){if(values.password!==values.repeat)throw new Error('As senhas não coincidem.');await submit('password-reset',{token,password:values.password});setDone(true);setMessage('Senha redefinida. Entre com a nova senha.');}
  else{const result=await submit('password-forgot',{email:values.email});setMessage(result.message);}
 }catch(caught:any){setError(caught.message);}finally{setBusy(false);}}
 return <div className="recovery-panel">
  {done?<div className="notice" role="status"><CheckCheck size={22}/><p>{message}</p></div>:<form onSubmit={send}>
   {token?<><label>Nova senha<input name="password" type="password" autoComplete="new-password" minLength={10} maxLength={128} required placeholder="No mínimo 10 caracteres"/></label><label>Confirmar nova senha<input name="repeat" type="password" autoComplete="new-password" minLength={10} maxLength={128} required/></label><small>O link é válido por 15 minutos e pode ser usado uma única vez.</small></>:<><label>E-mail de recuperação<input name="email" type="email" autoComplete="email" maxLength={255} required placeholder="E-mail cadastrado na sua conta"/></label><small>Use o e-mail cadastrado no Sentinela. O link para criar uma nova senha chegará nessa caixa.</small>{!available&&<div className="notice" role="status"><p>O envio de e-mails ainda não foi configurado. Contate o administrador.</p></div>}</>}
   {error&&<div className="form-error" role="alert">{error}</div>}{message&&!done&&<div className="notice" role="status"><p>{message}</p></div>}
   <button className="btn primary auth-submit" disabled={busy||(!token&&!available)}>{busy?<Loader2 size={18} className="spin"/>:<Mail size={18}/>} {token?'Salvar nova senha':'Enviar link de recuperação'}</button>
  </form>}
  <button className="text-btn recovery-back" onClick={back}><ArrowLeft size={16}/>Voltar para o login</button>
 </div>;
}
