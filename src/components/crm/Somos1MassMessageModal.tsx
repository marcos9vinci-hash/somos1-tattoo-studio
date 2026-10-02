import React, { useState } from 'react';
import { 
  X, 
  Send, 
  Users, 
  Rocket, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle,
  Clock
} from 'lucide-react';
import { ClienteCRM, ClienteLifecycleStage } from '../../types/crm';
import { crmService } from '../../lib/crmService';
import { cn } from '../../lib/utils';

interface Somos1MassMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientes: ClienteCRM[];
  onSucesso?: () => void;
}

export const Somos1MassMessageModal: React.FC<Somos1MassMessageModalProps> = ({
  isOpen,
  onClose,
  clientes,
  onSucesso
}) => {
  const [colunaSelecionada, setColunaSelecionada] = useState<ClienteLifecycleStage>('desmarcaram');
  const [mensagem, setMensagem] = useState(
    'Oi {nome}! Tudo bem? Passando para te avisar que estamos com novos horários especiais no Somos 1 Studio! Que tal resgatar aquele seu projeto de tattoo? 🎨'
  );
  const [enviando, setEnviando] = useState(false);
  const [progresso, setProgresso] = useState({ total: 0, atual: 0 });
  const [concluido, setConcluido] = useState(false);

  if (!isOpen) return null;

  const colunasOpcoes = [
    { id: 'novos' as ClienteLifecycleStage, label: 'Novos' },
    { id: 'negociacao' as ClienteLifecycleStage, label: 'Negociação' },
    { id: 'ativos' as ClienteLifecycleStage, label: 'Ativos' },
    { id: 'recorrentes' as ClienteLifecycleStage, label: 'Recorrentes' },
    { id: 'desmarcaram' as ClienteLifecycleStage, label: 'Desmarcaram' },
    { id: 'inativos' as ClienteLifecycleStage, label: 'Inativos' },
  ];

  const clientesAlvo = clientes.filter(c => {
    const cStage = c.estagioCiclo;
    return (
      cStage === colunaSelecionada ||
      (colunaSelecionada === 'novos' && cStage === 'novo') ||
      (colunaSelecionada === 'ativos' && cStage === 'ativo') ||
      (colunaSelecionada === 'recorrentes' && cStage === 'recorrente') ||
      (colunaSelecionada === 'inativos' && cStage === 'inativo')
    );
  });

  const handleDispararEmMassa = async () => {
    if (clientesAlvo.length === 0 || !mensagem.trim()) return;

    setEnviando(true);
    setConcluido(false);
    setProgresso({ total: clientesAlvo.length, atual: 0 });

    for (let i = 0; i < clientesAlvo.length; i++) {
      const cliente = clientesAlvo[i];
      const msgPersonalizada = mensagem.replace('{nome}', cliente.nome.split(' ')[0]);

      try {
        if (cliente.telefone) {
          await crmService.enviarMensagemChat(
            cliente.id,
            msgPersonalizada,
            'tatuador',
            cliente.telefone
          );
        }
      } catch (err) {
        console.warn(`Aviso no disparo para ${cliente.nome}:`, err);
      }

      setProgresso({ total: clientesAlvo.length, atual: i + 1 });
      // Pequeno intervalo entre envios para respeitar a taxa da Evolution
      await new Promise(r => setTimeout(r, 800));
    }

    setEnviando(false);
    setConcluido(true);
    if (onSucesso) onSucesso();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-zinc-950 border border-white/10 rounded-3xl w-full max-w-lg p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
        {/* Header do Modal */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-purple-600/20 text-purple-400 border border-purple-500/30">
              <Rocket className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-headline font-black text-base text-white uppercase tracking-wider">
                Disparo em Massa Inteligente
              </h3>
              <p className="text-xs text-zinc-400">
                Envie mensagens personalizadas para uma coluna inteira de clientes.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={enviando}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-white transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Seleção da Coluna */}
        <div>
          <label className="text-xs font-headline font-bold text-zinc-300 block mb-2">
            1. Selecione a Coluna de Destino
          </label>
          <div className="grid grid-cols-3 gap-2">
            {colunasOpcoes.map(col => {
              const count = clientes.filter(c => {
                const s = c.estagioCiclo;
                return s === col.id || (col.id === 'novos' && s === 'novo') || (col.id === 'ativos' && s === 'ativo') || (col.id === 'inativos' && s === 'inativo');
              }).length;

              return (
                <button
                  key={col.id}
                  type="button"
                  onClick={() => setColunaSelecionada(col.id)}
                  disabled={enviando}
                  className={cn(
                    "p-2.5 rounded-xl border text-xs font-headline font-bold flex flex-col items-center gap-1 transition-all",
                    colunaSelecionada === col.id
                      ? "bg-purple-600/20 border-purple-500 text-purple-300 shadow-md"
                      : "bg-zinc-900 border-white/5 text-zinc-400 hover:text-white hover:border-white/20"
                  )}
                >
                  <span>{col.label}</span>
                  <span className="text-[10px] text-zinc-500 font-mono">({count} clientes)</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Mensagem e Variáveis */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-headline font-bold text-zinc-300">
              2. Modelo da Mensagem
            </label>
            <span className="text-[10px] text-primary-fixed bg-primary-fixed/10 px-2 py-0.5 rounded-md font-mono">
              Use &#123;nome&#125; para personalizar
            </span>
          </div>

          <textarea
            value={mensagem}
            onChange={e => setMensagem(e.target.value)}
            disabled={enviando}
            rows={4}
            className="w-full bg-zinc-900 border border-white/10 rounded-2xl p-3.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-primary-fixed resize-none"
          />
        </div>

        {/* Barra de Progresso */}
        {enviando && (
          <div className="space-y-1.5 bg-purple-950/30 border border-purple-500/20 p-3.5 rounded-2xl">
            <div className="flex items-center justify-between text-xs font-headline">
              <span className="text-purple-300 font-bold flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 animate-spin" />
                Disparando mensagens...
              </span>
              <span className="text-white font-mono">{progresso.atual} / {progresso.total}</span>
            </div>
            <div className="w-full bg-zinc-900 rounded-full h-2 overflow-hidden border border-white/5">
              <div 
                className="bg-purple-500 h-full transition-all duration-300 rounded-full"
                style={{ width: `${(progresso.atual / progresso.total) * 100}%` }}
              />
            </div>
          </div>
        )}

        {concluido && (
          <div className="bg-emerald-950/40 border border-emerald-500/30 p-3.5 rounded-2xl text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Disparo em massa concluído com sucesso para todos os clientes da coluna!</span>
          </div>
        )}

        {/* Rodapé e Botões */}
        <div className="flex items-center gap-2 pt-2 border-t border-white/5">
          <button
            type="button"
            onClick={onClose}
            disabled={enviando}
            className="flex-1 py-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-xl text-xs font-headline font-bold uppercase transition-all"
          >
            Fechar
          </button>

          <button
            type="button"
            onClick={handleDispararEmMassa}
            disabled={enviando || clientesAlvo.length === 0 || !mensagem.trim()}
            className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl text-xs font-headline font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-purple-600/20 active:scale-95"
          >
            <Send className="w-3.5 h-3.5" />
            {enviando ? 'Disparando...' : `Disparar para ${clientesAlvo.length} Clientes`}
          </button>
        </div>
      </div>
    </div>
  );
};
