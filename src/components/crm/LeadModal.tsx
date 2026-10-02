import React, { useState } from 'react';
import { Lead, LeadStage, LeadSource } from '../../types/crm';
import { X, Send, Sparkles, MessageCircle, Flame, Plus, Trash2 } from 'lucide-react';

interface LeadModalProps {
  lead?: Lead | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (leadData: Partial<Lead>) => Promise<void>;
  onDelete?: (leadId: string) => Promise<void>;
  onSendMessage?: (lead: Lead, msg: string) => Promise<void>;
}

export const LeadModal: React.FC<LeadModalProps> = ({
  lead,
  isOpen,
  onClose,
  onSave,
  onDelete,
  onSendMessage
}) => {
  if (!isOpen) return null;

  const [nome, setNome] = useState(lead?.nome || '');
  const [telefone, setTelefone] = useState(lead?.telefone || '');
  const [origem, setOrigem] = useState<LeadSource>(lead?.origem || 'whatsapp');
  const [estagio, setEstagio] = useState<LeadStage>(lead?.estagio || 'novo');
  const [temperatura, setTemperatura] = useState<'frio' | 'morno' | 'quente'>(lead?.temperatura || 'morno');
  const [ideiaProjeto, setIdeiaProjeto] = useState(lead?.ideiaProjeto || '');
  const [estiloTatuagem, setEstiloTatuagem] = useState(lead?.estiloTatuagem || '');
  const [tamanhoAproximado, setTamanhoAproximado] = useState(lead?.tamanhoAproximado || '');
  const [localCorpo, setLocalCorpo] = useState(lead?.localCorpo || '');
  const [ticketEstimado, setTicketEstimado] = useState<number>(lead?.spin?.ticketEstimado || 0);
  const [urgencia, setUrgencia] = useState<'baixa' | 'media' | 'alta'>(lead?.spin?.urgencia || 'media');
  
  // Notas e Mensagem Direta
  const [novaNota, setNovaNota] = useState('');
  const [mensagemDirect, setMensagemDirect] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        nome,
        telefone,
        origem,
        estagio,
        temperatura,
        ideiaProjeto,
        estiloTatuagem,
        tamanhoAproximado,
        localCorpo,
        spin: {
          ...lead?.spin,
          ticketEstimado: Number(ticketEstimado) || 0,
          urgencia
        }
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleSendDirect = async () => {
    if (!lead || !onSendMessage || !mensagemDirect.trim()) return;
    setSendingMsg(true);
    try {
      await onSendMessage(lead, mensagemDirect.trim());
      setMensagemDirect('');
    } finally {
      setSendingMsg(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl my-8">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/40">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-white text-lg">
              {lead ? `Detalhes do Lead: ${lead.nome}` : 'Cadastrar Novo Lead'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">Nome Completo *</label>
              <input
                type="text"
                required
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: João Silva"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">WhatsApp / Telefone *</label>
              <input
                type="text"
                required
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                placeholder="Ex: 11988887777"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">Origem do Lead</label>
              <select
                value={origem}
                onChange={(e) => setOrigem(e.target.value as LeadSource)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
              >
                <option value="whatsapp">WhatsApp Direto</option>
                <option value="instagram">Instagram Direct</option>
                <option value="indicacao">Indicação / Boca a boca</option>
                <option value="n8n_agente">Agente de IA (n8n)</option>
                <option value="manual">Cadastro Manual</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">Etapa no Funil</label>
              <select
                value={estagio}
                onChange={(e) => setEstagio(e.target.value as LeadStage)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
              >
                <option value="novo">Novo Lead</option>
                <option value="qualificacao">Em Qualificação (SPIN)</option>
                <option value="negociacao">💬 Em Negociação</option>
                <option value="agendado">📅 Sessão Agendada</option>
                <option value="concluido">✅ Trabalho Realizado</option>
                <option value="pos_venda">✨ Pós-Venda (Cicatrização)</option>
                <option value="followup">🔕 Follow-up / Resgate</option>
                <option value="perdido">❌ Perdido / Desistiu</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">Temperatura</label>
              <select
                value={temperatura}
                onChange={(e) => setTemperatura(e.target.value as any)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
              >
                <option value="frio">❄️ Frio (Curioso)</option>
                <option value="morno">☕ Morno (Interesse)</option>
                <option value="quente">🔥 Quente (Quer fechar)</option>
              </select>
            </div>
          </div>

          {/* Dados do Projeto */}
          <div className="border-t border-zinc-800/80 pt-3">
            <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">
              Projeto & Qualificação Comercial
            </h4>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Ideia ou Briefing da Tattoo</label>
                <textarea
                  rows={2}
                  value={ideiaProjeto}
                  onChange={(e) => setIdeiaProjeto(e.target.value)}
                  placeholder="Ex: Leão em realismo preto e cinza no antebraço..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Estilo</label>
                  <input
                    type="text"
                    value={estiloTatuagem}
                    onChange={(e) => setEstiloTatuagem(e.target.value)}
                    placeholder="Ex: Realismo, Fineline"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Tamanho Aprox.</label>
                  <input
                    type="text"
                    value={tamanhoAproximado}
                    onChange={(e) => setTamanhoAproximado(e.target.value)}
                    placeholder="Ex: 15 cm"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Valor Estimado (R$)</label>
                  <input
                    type="number"
                    value={ticketEstimado}
                    onChange={(e) => setTicketEstimado(Number(e.target.value))}
                    placeholder="Ex: 800"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Seção de Disparo WhatsApp */}
          {lead && onSendMessage && (
            <div className="border-t border-zinc-800/80 pt-3 bg-zinc-950/40 p-3 rounded-xl border border-zinc-800">
              <label className="block text-xs font-bold text-emerald-400 mb-1 flex items-center gap-1">
                <MessageCircle className="w-3.5 h-3.5" />
                Disparar Mensagem via WhatsApp (n8n / Evolution API)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={mensagemDirect}
                  onChange={(e) => setMensagemDirect(e.target.value)}
                  placeholder="Ex: Oi! Vi seu interesse no leão realista, vamos agendar uma consultoria?"
                  className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={handleSendDirect}
                  disabled={!mensagemDirect.trim() || sendingMsg}
                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  Enviar
                </button>
              </div>
            </div>
          )}

          {/* Histórico de Notas Internas */}
          {lead?.notasInternas && lead.notasInternas.length > 0 && (
            <div className="border-t border-zinc-800/80 pt-3">
              <h4 className="text-xs font-semibold text-zinc-400 mb-2">Histórico de Atendimento</h4>
              <div className="space-y-1.5 max-h-32 overflow-y-auto bg-zinc-950 p-2.5 rounded-lg border border-zinc-800">
                {lead.notasInternas.map((nota, i) => (
                  <p key={i} className="text-xs text-zinc-300">
                    {nota}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Rodapé com Salvar e Deletar */}
          <div className="border-t border-zinc-800 pt-4 flex items-center justify-between">
            {lead && onDelete ? (
              <button
                type="button"
                onClick={() => {
                  if (confirm('Tem certeza que deseja excluir este lead?')) {
                    onDelete(lead.id);
                    onClose();
                  }
                }}
                className="text-rose-400 hover:text-rose-300 flex items-center gap-1 text-xs font-medium"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Excluir Lead
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-lg text-sm transition-colors shadow-md"
              >
                {saving ? 'Salvando...' : 'Salvar Lead'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
