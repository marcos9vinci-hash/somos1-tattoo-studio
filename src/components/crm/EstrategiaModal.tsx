import React, { useState, useEffect } from 'react';
import { EstrategiaCampanha, ClienteCRM, ClienteCarteiraTempStage } from '../../types/crm';
import { X, Sparkles, Save, Trash2, Users, Clock, AlertTriangle } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  estrategia: EstrategiaCampanha | null;
  clientes: ClienteCRM[];
  onSave: (estrategia: EstrategiaCampanha) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

export const EstrategiaModal: React.FC<Props> = ({
  isOpen,
  onClose,
  estrategia,
  clientes,
  onSave,
  onDelete
}) => {
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [emoji, setEmoji] = useState('🎯');
  const [criterioTipo, setCriterioTipo] = useState<'dias' | 'temperatura' | 'desmarcou' | 'saldo_indicacao'>('dias');
  const [diasMin, setDiasMin] = useState(16);
  const [diasMax, setDiasMax] = useState(45);
  const [temperaturasAlvo, setTemperaturasAlvo] = useState<ClienteCarteiraTempStage[]>(['morno']);
  const [mensagemTemplate, setMensagemTemplate] = useState('');
  const [especialistaAssinatura, setEspecialistaAssinatura] = useState('🌿 [Pós-Venda · Cuidados Juliana]');
  const [limiteDiario, setLimiteDiario] = useState(25);
  const [saving, setSaving] = useState(false);
  const [gerandoIA, setGerandoIA] = useState(false);

  useEffect(() => {
    if (estrategia) {
      setTitulo(estrategia.titulo);
      setDescricao(estrategia.descricao);
      setEmoji(estrategia.emoji || '🎯');
      setCriterioTipo(estrategia.criterioTipo);
      setDiasMin(estrategia.diasMin ?? 16);
      setDiasMax(estrategia.diasMax ?? 45);
      setTemperaturasAlvo(estrategia.temperaturaAlvo || ['morno']);
      setMensagemTemplate(estrategia.mensagemTemplate);
      setEspecialistaAssinatura(estrategia.especialistaAssinatura || '🌿 [Pós-Venda · Cuidados Juliana]');
      setLimiteDiario(estrategia.limiteDiario ?? 25);
    } else {
      setTitulo('Nova Campanha de Reativação');
      setDescricao('Estratégia personalizada para despertar clientes da base.');
      setEmoji('⚡');
      setCriterioTipo('dias');
      setDiasMin(30);
      setDiasMax(60);
      setTemperaturasAlvo(['morno', 'esfriando']);
      setMensagemTemplate('Fala [Nome]! Tudo bem? Lembrei de você aqui no estúdio Somos 1. Como tá sua tattoo? Separei uma condição especial se quiser rabiscar esse mês!');
      setEspecialistaAssinatura('🤖 [Clone do Dono · Marquinhos]');
      setLimiteDiario(20);
    }
  }, [estrategia, isOpen]);

  if (!isOpen) return null;

  // Cálculo ao vivo de clientes atingidos por esta estratégia
  const clientesQualificados = clientes.filter(c => {
    if (criterioTipo === 'dias') {
      if (c.diasSemContato === undefined) return false;
      return c.diasSemContato >= diasMin && c.diasSemContato <= diasMax;
    }
    if (criterioTipo === 'temperatura') {
      return temperaturasAlvo.includes(c.bucketTemperatura);
    }
    if (criterioTipo === 'desmarcou') {
      return Boolean(c.desmarcouEm) || (c.agendamentos && c.agendamentos.some(b => b.status === 'rescheduled' || b.status === 'no_show'));
    }
    if (criterioTipo === 'saldo_indicacao') {
      return c.totalSessoes > 0 && (c.bucketTemperatura === 'quente' || c.bucketTemperatura === 'morno' || c.bucketTemperatura === 'alerta');
    }
    return false;
  });

  const handleToggleTemperatura = (t: ClienteCarteiraTempStage) => {
    if (temperaturasAlvo.includes(t)) {
      if (temperaturasAlvo.length > 1) {
        setTemperaturasAlvo(temperaturasAlvo.filter(item => item !== t));
      }
    } else {
      setTemperaturasAlvo([...temperaturasAlvo, t]);
    }
  };

  const handleSugerirComIA = () => {
    setGerandoIA(true);
    setTimeout(() => {
      let sugestao = '';
      if (criterioTipo === 'dias') {
        if (diasMax <= 15) {
          sugestao = 'Fala [Nome]! Passando pra saber como tá a cicatrização da sua tattoo. Já começou a descascar? Lembra de manter a camada fina de pomada e não coçar. Qualquer dúvida me chama aqui no Whats!';
        } else if (diasMax <= 50) {
          sugestao = 'Opa [Nome]! Já deu tempo da sua tattoo assentar na pele! Consegue mandar uma foto aí na luz natural pra eu ver como ficou o resultado final? E se precisar de algum retoquezinho de leve a gente já marca!';
        } else if (diasMax <= 100) {
          sugestao = 'Fala [Nome], beleza? Lembrei de você aqui no estúdio! Aquela sua tattoo já tá 100% cicatrizada. Já pensou no próximo rabisco ou em continuar aquele projeto? Separei uma condição especial pra você esse mês!';
        } else {
          sugestao = 'Opa [Nome]! Passando pra te mandar um salve e avisar que seus créditos do programa de indicação continuam ativos no Somos 1. Bora aproveitar pra fechar aquela tattoo nova com desconto VIP?';
        }
      } else if (criterioTipo === 'desmarcou') {
        sugestao = 'Fala [Nome]! Vi aqui no sistema que a gente não conseguiu fechar a data daquela sua tattoo. Ficou alguma dúvida sobre o valor ou sobre a arte? Se quiser, consigo um encaixe VIP pra essa semana pra gente fazer!';
      } else {
        sugestao = 'Opa [Nome]! Tudo certo por aí? Notamos que você tem créditos acumulados para abater na sua próxima tattoo. Quer dar uma olhada nos horários VIPs abertos para essa semana?';
      }
      setMensagemTemplate(sugestao);
      setGerandoIA(false);
    }, 400);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: EstrategiaCampanha = {
        id: estrategia?.id || `campanha_${Date.now()}`,
        titulo: titulo.trim(),
        descricao: descricao.trim(),
        emoji: emoji.trim() || '🎯',
        criterioTipo,
        diasMin: criterioTipo === 'dias' ? Number(diasMin) : undefined,
        diasMax: criterioTipo === 'dias' ? Number(diasMax) : undefined,
        temperaturaAlvo: criterioTipo === 'temperatura' ? temperaturasAlvo : undefined,
        mensagemTemplate: mensagemTemplate.trim(),
        especialistaAssinatura,
        limiteDiario: Number(limiteDiario) || 25,
        ativa: estrategia ? estrategia.ativa : true,
        updatedAt: new Date().toISOString()
      };
      await onSave(payload);
      onClose();
    } catch (err: any) {
      alert('Erro ao salvar estratégia: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-zinc-900 border border-zinc-700 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/70">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">{emoji}</span>
            <div>
              <h3 className="font-headline font-black text-white text-base">
                {estrategia ? 'Editar Estratégia de Reativação' : 'Criar Nova Estratégia'}
              </h3>
              <p className="text-xs text-zinc-400">
                Configure os critérios de filtro e o modelo de mensagem disparado com proteção Meta.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
          
          {/* Identificação */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="sm:col-span-1">
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                Emoji
              </label>
              <input
                type="text"
                value={emoji}
                onChange={e => setEmoji(e.target.value)}
                maxLength={4}
                className="w-full text-center text-lg bg-zinc-950 border border-zinc-700 rounded-xl py-2 text-white"
              />
            </div>
            <div className="sm:col-span-3">
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                Nome da Estratégia
              </label>
              <input
                type="text"
                value={titulo}
                onChange={e => setTitulo(e.target.value)}
                required
                placeholder="Ex: 📸 Foto & Retoque (16 a 45 dias)"
                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
              Descrição Curta da Campanha
            </label>
            <input
              type="text"
              value={descricao}
              onChange={e => setDescricao(e.target.value)}
              placeholder="Ex: Pede foto do resultado e oferece retoque se necessário."
              className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white"
            />
          </div>

          {/* Critério de Seleção dos Clientes */}
          <div className="p-4 bg-zinc-950 rounded-2xl border border-zinc-800 space-y-3">
            <label className="text-xs font-bold text-white uppercase tracking-wider block">
              Como Selecionar os Clientes desta Estratégia:
            </label>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setCriterioTipo('dias')}
                className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                  criterioTipo === 'dias'
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500'
                    : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                📅 Por Dias Sem Tatuar
              </button>

              <button
                type="button"
                onClick={() => setCriterioTipo('temperatura')}
                className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                  criterioTipo === 'temperatura'
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500'
                    : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                🌡️ Coluna de Temperatura
              </button>

              <button
                type="button"
                onClick={() => setCriterioTipo('desmarcou')}
                className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                  criterioTipo === 'desmarcou'
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500'
                    : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                ❄️ No-Shows / Faltas
              </button>

              <button
                type="button"
                onClick={() => setCriterioTipo('saldo_indicacao')}
                className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                  criterioTipo === 'saldo_indicacao'
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500'
                    : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                💎 Créditos &amp; Indicação
              </button>
            </div>

            {/* Configuração do Critério de Dias */}
            {criterioTipo === 'dias' && (
              <div className="pt-2 border-t border-zinc-800/80 flex items-center gap-4">
                <div className="flex-1">
                  <label className="text-[11px] text-zinc-400 block mb-1">Dias Mínimos sem contato:</label>
                  <input
                    type="number"
                    min="0"
                    max="999"
                    value={diasMin}
                    onChange={e => setDiasMin(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-white"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-[11px] text-zinc-400 block mb-1">Dias Máximos sem contato:</label>
                  <input
                    type="number"
                    min={diasMin}
                    max="999"
                    value={diasMax}
                    onChange={e => setDiasMax(Math.max(diasMin, parseInt(e.target.value) || diasMin))}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-white"
                  />
                </div>
              </div>
            )}

            {/* Configuração de Colunas de Temperatura */}
            {criterioTipo === 'temperatura' && (
              <div className="pt-2 border-t border-zinc-800/80 flex flex-wrap gap-2">
                {[
                  { id: 'quente', label: '🔥 Quente (0-7d)' },
                  { id: 'morno', label: '☀️ Morno (8-30d)' },
                  { id: 'esfriando', label: '❄️ Esfriando (31-90d)' },
                  { id: 'alerta', label: '🧊 Alerta (91-179d)' },
                  { id: 'expirado', label: '⌛ Expirado (>180d)' }
                ].map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleToggleTemperatura(t.id as any)}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                      temperaturasAlvo.includes(t.id as any)
                        ? 'bg-amber-500 text-black border-amber-400'
                        : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            )}

            {/* Contador Dinâmico de Clientes Qualificados */}
            <div className="p-3 bg-zinc-900/90 rounded-xl border border-white/5 flex items-center justify-between text-xs">
              <span className="text-zinc-400 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-amber-400" />
                Clientes qualificados para esta campanha agora:
              </span>
              <span className="font-headline font-black text-white bg-amber-500/20 text-amber-400 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                {clientesQualificados.length} cliente(s)
              </span>
            </div>
          </div>

          {/* Template de Mensagem com Botão de IA */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider">
                Mensagem Template (WhatsApp)
              </label>
              <button
                type="button"
                onClick={handleSugerirComIA}
                disabled={gerandoIA}
                className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 font-bold bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 px-3 py-1 rounded-xl transition-all"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{gerandoIA ? 'Gerando...' : '✨ Sugerir com IA'}</span>
              </button>
            </div>

            <textarea
              rows={4}
              value={mensagemTemplate}
              onChange={e => setMensagemTemplate(e.target.value)}
              required
              className="w-full bg-zinc-950 border border-zinc-700 rounded-xl p-3 text-xs text-white leading-relaxed font-sans"
              placeholder="Use [Nome] para o nome do cliente e [Tatuagem] para o estilo..."
            />
            <p className="text-[10px] text-zinc-500">
              Dica: O robô substitui <code>[Nome]</code> pelo primeiro nome do cliente na hora do disparo.
            </p>
          </div>

          {/* Assinatura do Especialista & Limite Diário */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                Assinatura do Especialista
              </label>
              <input
                type="text"
                value={especialistaAssinatura}
                onChange={e => setEspecialistaAssinatura(e.target.value)}
                placeholder="Ex: 🌿 [Pós-Venda · Cuidados Juliana]"
                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                Limite Diário Seguro (Anti-Ban)
              </label>
              <input
                type="number"
                min="5"
                max="50"
                value={limiteDiario}
                onChange={e => setLimiteDiario(Math.max(1, parseInt(e.target.value) || 20))}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>
          </div>

          {/* Ações do Footer */}
          <div className="pt-3 border-t border-zinc-800 flex items-center justify-between">
            {estrategia && onDelete ? (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`Tem certeza que deseja excluir a estratégia "${titulo}"?`)) {
                    onDelete(estrategia.id);
                    onClose();
                  }
                }}
                className="p-2.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl transition-all flex items-center gap-1.5 text-xs font-bold"
              >
                <Trash2 className="w-4 h-4" />
                <span>Excluir</span>
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-bold transition-all"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-black font-headline font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{saving ? 'Salvando...' : 'Salvar Estratégia'}</span>
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};
