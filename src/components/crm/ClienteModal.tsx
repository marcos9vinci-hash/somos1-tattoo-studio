import React, { useState } from 'react';
import { ClienteCRM, ClienteLifecycleStage } from '../../types/crm';
import { X, Send, Sparkles, MessageCircle, DollarSign, Clock, Plus, Trash2 } from 'lucide-react';

interface ClienteModalProps {
  cliente?: ClienteCRM | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (clienteData: Partial<ClienteCRM>) => Promise<void>;
  onDelete?: (clienteId: string) => Promise<void>;
  onDispararFollowUp?: (cliente: ClienteCRM, msgCustom?: string) => Promise<void>;
}

export const ClienteModal: React.FC<ClienteModalProps> = ({
  cliente,
  isOpen,
  onClose,
  onSave,
  onDelete,
  onDispararFollowUp
}) => {
  if (!isOpen) return null;

  const [nome, setNome] = useState(cliente?.nome || '');
  const [telefone, setTelefone] = useState(cliente?.telefone || '');
  const [email, setEmail] = useState(cliente?.email || '');
  const [instagram, setInstagram] = useState(cliente?.instagram || '');
  const [estagioCiclo, setEstagioCiclo] = useState<ClienteLifecycleStage>(cliente?.estagioCiclo || 'novo');
  const [totalGasto, setTotalGasto] = useState<number>(cliente?.totalGasto || 0);
  const [totalSessoes, setTotalSessoes] = useState<number>(cliente?.totalSessoes || 1);
  const [estilosFavoritos, setEstilosFavoritos] = useState(cliente?.estilosFavoritos?.join(', ') || '');
  
  // Follow-up e Notas
  const [mensagemFollowUp, setMensagemFollowUp] = useState('');
  const [sendingFollowUp, setSendingFollowUp] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        nome,
        telefone,
        email,
        instagram,
        estagioCiclo,
        bucketTemperatura: (cliente?.bucketTemperatura || estagioCiclo) as any,
        totalGasto: Number(totalGasto) || 0,
        totalSessoes: Number(totalSessoes) || 1,
        estilosFavoritos: estilosFavoritos.split(',').map(s => s.trim()).filter(Boolean)
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleSendFollowUp = async () => {
    if (!cliente || !onDispararFollowUp) return;
    setSendingFollowUp(true);
    try {
      await onDispararFollowUp(cliente, mensagemFollowUp.trim() || undefined);
      setMensagemFollowUp('');
    } finally {
      setSendingFollowUp(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl my-8">
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/40">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-400" />
            <h3 className="font-bold text-white text-lg">
              {cliente ? `Ficha do Cliente: ${cliente.nome}` : 'Cadastrar Novo Cliente'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">Nome Completo *</label>
              <input
                type="text"
                required
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Mariana Lima"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">WhatsApp / Telefone *</label>
              <input
                type="text"
                required
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                placeholder="Ex: 11999998888"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">Ciclo de Vida</label>
              <select
                value={estagioCiclo}
                onChange={(e) => setEstagioCiclo(e.target.value as ClienteLifecycleStage)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
              >
                <option value="quente">🔥 Quente (0–7 dias pós-tattoo)</option>
                <option value="morno">☀️ Morno (8–30 dias)</option>
                <option value="esfriando">❄️ Esfriando (31–90 dias)</option>
                <option value="alerta">🧊 Alerta (91–179 dias)</option>
                <option value="expirado">⌛ Expirado (&gt;180 dias)</option>
                <option value="emReativacao">🔄 Em Reativação</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">Total Gasto (R$)</label>
              <input
                type="number"
                value={totalGasto}
                onChange={(e) => setTotalGasto(Number(e.target.value))}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">Qtd. Sessões Feitas</label>
              <input
                type="number"
                value={totalSessoes}
                onChange={(e) => setTotalSessoes(Number(e.target.value))}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">Estilos Favoritos (separados por vírgula)</label>
            <input
              type="text"
              value={estilosFavoritos}
              onChange={(e) => setEstilosFavoritos(e.target.value)}
              placeholder="Ex: Fineline, Floral, Realismo"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* Follow-Up WhatsApp */}
          {cliente && onDispararFollowUp && (
            <div className="border-t border-zinc-800/80 pt-3 bg-zinc-950/40 p-3 rounded-xl border border-zinc-800">
              <label className="block text-xs font-bold text-emerald-400 mb-1 flex items-center gap-1">
                <MessageCircle className="w-3.5 h-3.5" />
                Disparar Mensagem de Follow-up / Reativação
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={mensagemFollowUp}
                  onChange={(e) => setMensagemFollowUp(e.target.value)}
                  placeholder="Deixe em branco para usar o template padrão do Somos 1 Tattoo..."
                  className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={handleSendFollowUp}
                  disabled={sendingFollowUp}
                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  Disparar
                </button>
              </div>
            </div>
          )}

          {/* Histórico */}
          {cliente?.notasInternas && cliente.notasInternas.length > 0 && (
            <div className="border-t border-zinc-800/80 pt-3">
              <h4 className="text-xs font-semibold text-zinc-400 mb-2">Histórico de Atendimento & Follow-ups</h4>
              <div className="space-y-1.5 max-h-32 overflow-y-auto bg-zinc-950 p-2.5 rounded-lg border border-zinc-800">
                {cliente.notasInternas.map((nota, i) => (
                  <p key={i} className="text-xs text-zinc-300">
                    {nota}
                  </p>
                ))}
              </div>
            </div>
          )}

          <div className="border-t border-zinc-800 pt-4 flex items-center justify-between">
            {cliente && onDelete ? (
              <button
                type="button"
                onClick={() => {
                  if (confirm('Tem certeza que deseja excluir este cliente?')) {
                    onDelete(cliente.id);
                    onClose();
                  }
                }}
                className="text-rose-400 hover:text-rose-300 flex items-center gap-1 text-xs font-medium"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Excluir Cliente
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
                className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg text-sm transition-colors shadow-md"
              >
                {saving ? 'Salvando...' : 'Salvar Cliente'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
