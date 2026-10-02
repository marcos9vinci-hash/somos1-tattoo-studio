import React, { useState, useEffect } from 'react';
import { 
  X, 
  Calendar, 
  Clock, 
  DollarSign, 
  MessageSquare, 
  Send, 
  Image as ImageIcon, 
  Save, 
  ExternalLink,
  Sparkles,
  Phone,
  Mail,
  Instagram,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { ClienteCRM } from '../../types/crm';
import { crmService } from '../../lib/crmService';
import { cn } from '../../lib/utils';

interface Somos1ClientDetailPanelProps {
  cliente: ClienteCRM | null;
  isOpen: boolean;
  onClose: () => void;
  onAbrirChat: (cliente: ClienteCRM) => void;
  onDispararFollowUp?: (cliente: ClienteCRM) => void;
  onUpdateCliente?: (cliente: ClienteCRM) => void;
}

export const Somos1ClientDetailPanel: React.FC<Somos1ClientDetailPanelProps> = ({
  cliente,
  isOpen,
  onClose,
  onAbrirChat,
  onDispararFollowUp,
  onUpdateCliente
}) => {
  const [activeTab, setActiveTab] = useState<'sessoes' | 'fotos' | 'notas'>('sessoes');
  const [observacoes, setObservacoes] = useState('');
  const [salvandoNotas, setSalvandoNotas] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (cliente) {
      setObservacoes(cliente.observacoesInternas || '');
    }
  }, [cliente]);

  if (!isOpen || !cliente) return null;

  const handleSalvarNotas = async () => {
    if (!cliente) return;
    setSalvandoNotas(true);
    try {
      await crmService.salvarObservacoesCliente(cliente.id, observacoes);
      setFeedback('Anotações salvas com sucesso!');
      if (onUpdateCliente) {
        onUpdateCliente({ ...cliente, observacoesInternas: observacoes });
      }
      setTimeout(() => setFeedback(null), 3000);
    } catch (e) {
      setFeedback('Erro ao salvar observações.');
    } finally {
      setSalvandoNotas(false);
    }
  };

  const handleMudarTemperatura = async (novaTemp: any) => {
    if (!cliente) return;
    try {
      await crmService.updateCliente(cliente.id, { bucketTemperatura: novaTemp });
      if (onUpdateCliente) {
        onUpdateCliente({ ...cliente, bucketTemperatura: novaTemp });
      }
      setFeedback(`Cliente movido para ${novaTemp}!`);
      setTimeout(() => setFeedback(null), 3000);
    } catch (e) {
      console.warn("Aviso ao atualizar temperatura:", e);
    }
  };

  const abrirNoWhatsApp = () => {
    if (!cliente.telefone) return;
    const limpo = cliente.telefone.replace(/\D/g, '');
    const msg = `Olá ${cliente.nome}! Passando para saber como você está e se precisa de algo sobre sua tattoo no Somos 1 Studio!`;
    const url = `https://wa.me/55${limpo}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  const agendamentos = cliente.agendamentos || [];
  const fotos = cliente.fotosTatuagensFeitas || [];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      {/* Clique fora para fechar */}
      <div className="flex-1" onClick={onClose} />

      {/* Drawer Lateral */}
      <div className="w-full sm:w-[600px] h-full bg-zinc-950 border-l border-white/10 flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
        {/* Header da Ficha */}
        <div className="p-5 border-b border-white/10 bg-zinc-900/90 shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-black font-headline font-black text-lg shrink-0 shadow-lg">
                {cliente.nome.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <h2 className="font-headline font-black text-base text-white truncate">
                  {cliente.nome}
                </h2>
                <div className="flex flex-wrap items-center gap-2 mt-0.5 text-xs text-zinc-400 font-mono">
                  <span>{cliente.telefone || 'Sem telefone'}</span>
                  {cliente.email && <span>• {cliente.email}</span>}
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-all shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* KPI Mini-Cards */}
          <div className="grid grid-cols-3 gap-2 mt-4">
            <div className="bg-zinc-950 p-2.5 rounded-xl border border-white/5">
              <span className="text-[10px] text-zinc-500 font-headline block">Gasto Acumulado</span>
              <span className="text-sm font-headline font-black text-emerald-400">
                R$ {cliente.totalGasto || 0}
              </span>
            </div>
            <div className="bg-zinc-950 p-2.5 rounded-xl border border-white/5">
              <span className="text-[10px] text-zinc-500 font-headline block">Total de Sessões</span>
              <span className="text-sm font-headline font-black text-amber-400">
                {cliente.totalSessoes || 0} concluídas
              </span>
            </div>
            <div className="bg-zinc-950 p-2.5 rounded-xl border border-white/5">
              <span className="text-[10px] text-zinc-500 font-headline block">Último Contato</span>
              <span className="text-sm font-headline font-black text-zinc-300">
                {cliente.diasSemContato !== undefined ? `${cliente.diasSemContato}d atrás` : 'Recente'}
              </span>
            </div>
          </div>

          {/* Seletor de Temperatura da Carteira */}
          <div className="mt-3.5 bg-zinc-950 p-2.5 rounded-xl border border-white/5 flex items-center justify-between gap-2">
            <span className="text-[10px] text-zinc-400 font-headline uppercase tracking-wider shrink-0">
              Esteira de Temperatura:
            </span>
            <select
              value={cliente.bucketTemperatura || 'morno'}
              onChange={e => handleMudarTemperatura(e.target.value)}
              className="bg-zinc-900 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white font-bold focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              <option value="quente">🔥 Quente (0–7d pós-tattoo)</option>
              <option value="morno">☀️ Morno (8–30d)</option>
              <option value="esfriando">❄️ Esfriando (31–90d)</option>
              <option value="alerta">🧊 Alerta (91–179d)</option>
              <option value="expirado">⌛ Expirado (&gt;180d)</option>
              <option value="desmarcou">🚨 Faltou / No-Show</option>
              <option value="emReativacao">🔄 Em Reativação</option>
            </select>
          </div>

          {/* Botões de Ação Imediata */}
          <div className="flex items-center gap-2 mt-3.5">
            <button
              type="button"
              onClick={() => {
                onClose();
                onAbrirChat(cliente);
              }}
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-xl text-xs font-headline font-bold flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Chat no Navegador
            </button>

            {cliente.telefone && (
              <button
                type="button"
                onClick={abrirNoWhatsApp}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-xl text-xs font-headline font-bold flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95"
              >
                <Send className="w-3.5 h-3.5" />
                WhatsApp Web
              </button>
            )}

            {onDispararFollowUp && (
              <button
                type="button"
                onClick={() => onDispararFollowUp(cliente)}
                className="px-3 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30 py-2 rounded-xl text-xs font-headline font-bold transition-all"
                title="Disparar régua de follow-up pós-tattoo"
              >
                Follow-up
              </button>
            )}
          </div>
        </div>

        {/* Abas Internas da Ficha */}
        <div className="flex items-center gap-2 px-5 border-b border-white/10 bg-zinc-900/40">
          <button
            type="button"
            onClick={() => setActiveTab('sessoes')}
            className={cn(
              "py-3 text-xs font-headline font-bold border-b-2 transition-all flex items-center gap-1.5",
              activeTab === 'sessoes'
                ? "border-amber-500 text-amber-400"
                : "border-transparent text-zinc-400 hover:text-white"
            )}
          >
            <Calendar className="w-3.5 h-3.5" />
            Sessões & Agenda ({agendamentos.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('fotos')}
            className={cn(
              "py-3 text-xs font-headline font-bold border-b-2 transition-all flex items-center gap-1.5",
              activeTab === 'fotos'
                ? "border-amber-500 text-amber-400"
                : "border-transparent text-zinc-400 hover:text-white"
            )}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            Galeria & Tattoos ({fotos.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('notas')}
            className={cn(
              "py-3 text-xs font-headline font-bold border-b-2 transition-all flex items-center gap-1.5",
              activeTab === 'notas'
                ? "border-amber-500 text-amber-400"
                : "border-transparent text-zinc-400 hover:text-white"
            )}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Notas Internas
          </button>
        </div>

        {/* Conteúdo das Abas */}
        <div className="flex-1 p-5 overflow-y-auto">
          {activeTab === 'sessoes' && (
            <div className="space-y-3">
              {agendamentos.length === 0 ? (
                <div className="py-12 text-center text-zinc-500 text-xs font-headline italic">
                  Nenhum agendamento registrado ainda para este cliente.
                </div>
              ) : (
                agendamentos.map((b: any, idx: number) => (
                  <div
                    key={b.id || idx}
                    className="bg-zinc-900/90 border border-white/5 p-3.5 rounded-xl space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs font-headline">
                      <span className="text-white font-bold flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-amber-400" />
                        {b.date || 'Data a definir'} {b.time ? `às ${b.time}` : ''}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-zinc-800 text-zinc-300 border border-white/5">
                        {b.status || 'Agendado'}
                      </span>
                    </div>

                    <div className="text-xs text-zinc-400">
                      <p>{b.descricao_servico || `Tatuagem ${b.estilo || ''}`}</p>
                      {b.regiao_corpo && <p className="text-[11px] text-zinc-500">Região: {b.regiao_corpo}</p>}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[11px] font-headline">
                      <span className="text-zinc-500">Valor Estimado:</span>
                      <span className="text-emerald-400 font-bold">R$ {b.priceEstimated || b.valor_estimado || 0}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'fotos' && (
            <div>
              {fotos.length === 0 ? (
                <div className="py-12 text-center text-zinc-500 text-xs font-headline italic">
                  Nenhuma foto de tattoo ou referência anexada para este cliente.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {fotos.map((url, i) => (
                    <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-white/10 group">
                      <img src={url} alt={`tattoo-${i}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'notas' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-headline font-bold text-zinc-300 block mb-1.5">
                  Anotações Internas do Tatuador / Estúdio
                </label>
                <textarea
                  value={observacoes}
                  onChange={e => setObservacoes(e.target.value)}
                  placeholder="Escreva anotações importantes sobre o cliente (preferências, sensibilidade à dor, ideias futuras, observações de cicatrização)..."
                  rows={8}
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl p-3.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-primary-fixed resize-none"
                />
              </div>

              {feedback && (
                <div className="text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 p-2.5 rounded-xl flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{feedback}</span>
                </div>
              )}

              <button
                type="button"
                onClick={handleSalvarNotas}
                disabled={salvandoNotas}
                className="w-full bg-primary-fixed text-black font-headline font-black py-3 rounded-xl text-xs uppercase tracking-wider hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-md"
              >
                <Save className="w-4 h-4" />
                {salvandoNotas ? 'Salvando...' : 'Salvar Anotações Internas'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
