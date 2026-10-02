import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Check, CheckCheck } from 'lucide-react';
import { cn } from '../../lib/utils';
import { CRMMessage } from '../../types/crm';

interface MessageBubbleProps {
  mensagem: CRMMessage;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ mensagem }) => {
  const isCliente = mensagem.remetente === 'cliente';
  const isIA = mensagem.remetente === 'ia';
  
  let dataValida = new Date();
  if (mensagem.timestamp) {
    if (mensagem.timestamp.toDate) {
      dataValida = mensagem.timestamp.toDate();
    } else if (mensagem.timestamp instanceof Date) {
      dataValida = mensagem.timestamp;
    } else if (typeof mensagem.timestamp === 'string' || typeof mensagem.timestamp === 'number') {
      dataValida = new Date(mensagem.timestamp);
    }
  }

  let tempo = 'agora';
  try {
    tempo = formatDistanceToNow(dataValida, { 
      addSuffix: true, 
      locale: ptBR 
    });
  } catch (e) {
    tempo = 'recente';
  }

  const getAvatarConfig = () => {
    if (isCliente) return { fallback: 'CL', bg: 'bg-blue-600' };
    if (isIA) return { fallback: 'IA', bg: 'bg-purple-600' };
    return { fallback: 'TT', bg: 'bg-emerald-600' };
  };

  const avatarConfig = getAvatarConfig();

  return (
    <div className={cn(
      "flex gap-2.5 max-w-[85%]",
      isCliente ? "ml-auto flex-row-reverse" : "mr-auto"
    )}>
      <div className={cn(
        "h-7 w-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0 shadow-sm",
        avatarConfig.bg
      )}>
        {avatarConfig.fallback}
      </div>
      
      <div className={cn(
        "flex flex-col gap-1",
        isCliente ? "items-end" : "items-start"
      )}>
        <div className={cn(
          "rounded-2xl px-3.5 py-2.5 text-xs max-w-full break-words shadow-sm font-body leading-relaxed",
          isCliente 
            ? "bg-blue-600 text-white rounded-br-xs" 
            : isIA
            ? "bg-purple-950/80 text-purple-200 border border-purple-500/30 rounded-bl-xs"
            : "bg-zinc-800 text-zinc-100 border border-white/10 rounded-bl-xs"
        )}>
          <p className="whitespace-pre-wrap">{mensagem.mensagem}</p>
        </div>
        
        <div className={cn(
          "flex items-center gap-1.5 text-[10px] text-zinc-500 font-headline",
          isCliente ? "flex-row-reverse" : "flex-row"
        )}>
          <span>{tempo}</span>
          {!isCliente && (
            <div className="flex items-center">
              {mensagem.status === 'enviado' && <Check className="h-3 w-3 text-zinc-400" />}
              {mensagem.status === 'entregue' && <CheckCheck className="h-3 w-3 text-zinc-400" />}
              {mensagem.status === 'lido' && <CheckCheck className="h-3 w-3 text-blue-400" />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
