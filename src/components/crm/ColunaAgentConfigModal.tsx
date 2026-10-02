import React, { useState } from 'react';
import { ColunaAIAgentConfig } from '../../types/crm';
import { 
  Bot, 
  X, 
  Sparkles, 
  Sliders, 
  CheckCircle2, 
  ShieldCheck, 
  Clock, 
  Flame, 
  Volume2, 
  Plus, 
  Trash2 
} from 'lucide-react';

interface ColunaAgentConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: ColunaAIAgentConfig | null;
  onSave: (novaConfig: ColunaAIAgentConfig) => void;
}

export const ColunaAgentConfigModal: React.FC<ColunaAgentConfigModalProps> = ({
  isOpen,
  onClose,
  config,
  onSave
}) => {
  if (!isOpen || !config) return null;

  const [nomeAgente, setNomeAgente] = useState(config.nomeAgente);
  const [papel, setPapel] = useState(config.papel);
  const [tomDeVoz, setTomDeVoz] = useState(config.tomDeVoz);
  const [promptBase, setPromptBase] = useState(config.promptBase);
  const [skillsAtivas, setSkillsAtivas] = useState<string[]>([...config.skillsAtivas]);
  const [novaSkill, setNovaSkill] = useState('');
  const [ativo, setAtivo] = useState(config.ativo);
  const [tempoEsperaMinutos, setTempoEsperaMinutos] = useState(config.tempoEsperaMinutos || 15);

  const handleAddSkill = () => {
    if (!novaSkill.trim()) return;
    setSkillsAtivas(prev => [...prev, novaSkill.trim()]);
    setNovaSkill('');
  };

  const handleRemoveSkill = (index: number) => {
    setSkillsAtivas(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...config,
      nomeAgente,
      papel,
      tomDeVoz,
      promptBase,
      skillsAtivas,
      ativo,
      tempoEsperaMinutos
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="bg-zinc-900 border border-zinc-700/60 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl my-8 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-base">
                  Agente de IA — Etapa do Funil
                </h3>
                <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full font-mono">
                  {config.origemNaia}
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Personalidade, instruções e habilidades ativas desta coluna
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Status Ativo / Inativo */}
          <div className="flex items-center justify-between p-3.5 bg-zinc-950/80 rounded-xl border border-zinc-800">
            <div className="flex items-center gap-2.5">
              <Sparkles className={`w-4 h-4 ${ativo ? 'text-emerald-400' : 'text-zinc-600'}`} />
              <div>
                <span className="text-xs font-bold text-white block">Status da Automação de IA</span>
                <span className="text-[11px] text-zinc-400">
                  {ativo ? 'O agente atua e sugere respostas nesta etapa' : 'Automação pausada nesta coluna'}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setAtivo(!ativo)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all ${
                ativo 
                  ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20' 
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }`}
            >
              {ativo ? 'LIGADO' : 'PAUSADO'}
            </button>
          </div>

          {/* Nome e Papel */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">Nome do Agente</label>
              <input
                type="text"
                value={nomeAgente}
                onChange={e => setNomeAgente(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">Tom de Voz</label>
              <select
                value={tomDeVoz}
                onChange={e => setTomDeVoz(e.target.value as any)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              >
                <option value="casual_estudio">Casual de Estúdio (Markinhos / Tatuador)</option>
                <option value="consultivo_spin">Consultivo SPIN (Especialista empático)</option>
                <option value="persuasivo_copy">Persuasivo &amp; Fechamento (Jonathan)</option>
                <option value="acolhedor_posvenda">Acolhedor &amp; Cuidado (Juliana Pós-Venda)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">Papel / Missão</label>
            <input
              type="text"
              value={papel}
              onChange={e => setPapel(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Prompt e Instruções Base */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1 flex items-center justify-between">
              <span>Instruções Centrais (Prompt Base)</span>
              <span className="text-[10px] text-zinc-500">Framework NAIA</span>
            </label>
            <textarea
              rows={4}
              value={promptBase}
              onChange={e => setPromptBase(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-xs text-zinc-200 font-sans focus:outline-none focus:border-amber-500 leading-relaxed"
            />
          </div>

          {/* Skills / Habilidades Ativas */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-2">
              Habilidades &amp; Skills Ativas desta Etapa
            </label>
            <div className="space-y-1.5 mb-2.5">
              {skillsAtivas.map((skill, idx) => (
                <div 
                  key={idx} 
                  className="flex items-center justify-between bg-zinc-950 border border-zinc-800/80 px-3 py-1.5 rounded-lg text-xs text-zinc-300"
                >
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    {skill}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveSkill(idx)}
                    className="text-zinc-500 hover:text-rose-400 transition-colors p-1"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Adicionar nova habilidade (ex: calcular desconto PIX)..."
                value={novaSkill}
                onChange={e => setNovaSkill(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddSkill(); } }}
                className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
              />
              <button
                type="button"
                onClick={handleAddSkill}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-xs font-bold transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Footer Ações */}
          <div className="pt-3 border-t border-zinc-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-bold transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-black rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md active:scale-95"
            >
              Salvar Configuração do Agente
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
