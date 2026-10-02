import React, { useState } from 'react';
import { 
  Bot, 
  X, 
  Play, 
  CheckCircle2, 
  Clock, 
  Send, 
  Mic, 
  ShieldCheck, 
  AlertTriangle,
  Smartphone,
  Sparkles,
  ArrowRight,
  RotateCcw
} from 'lucide-react';
import { parseArtistWhatsAppIntent } from '../../lib/whatsappIntentParser';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onLeadSimuladoCriado?: (lead: any) => void;
}

interface LogStep {
  id: string;
  time: string;
  source: 'CLIENTE_ZAP' | 'EVOLUTION_WEBHOOK' | 'CRM_ENGINE' | 'COPILOTO_ZAP' | 'MARQUINHOS_RESPOSTA' | 'DISPARO_FINAL';
  tipo: 'info' | 'success' | 'warning' | 'bot';
  titulo: string;
  detalhe: string;
}

export const SimuladorFluxoWhatsAppModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onLeadSimuladoCriado
}) => {
  const [numeroFicticio, setNumeroFicticio] = useState('11999998888');
  const [nomeCliente, setNomeCliente] = useState('Lucas Teste (Fictício)');
  const [mensagemCliente, setMensagemCliente] = useState('Opa Marquinhos, boa tarde! Quanto fica pra fechar o antebraço com um leão e bússola?');
  const [cenarioAtivo, setCenarioAtivo] = useState<'novo_lead' | 'checkin_sessao' | 'reativacao'>('novo_lead');
  
  // Estado da Simulação
  const [faseSimulacao, setFaseSimulacao] = useState<'inicio' | 'aguardando_aprovacao' | 'concluido'>('inicio');
  const [logs, setLogs] = useState<LogStep[]>([]);
  const [propostaRobo, setPropostaRobo] = useState('');
  const [especialistaAtivo, setEspecialistaAtivo] = useState('🤖 [Triagem · Clone do Dono]');
  const [inputRespostaTatuador, setInputRespostaTatuador] = useState('');
  const [simulandoAudio, setSimulandoAudio] = useState(false);

  if (!isOpen) return null;

  const addLog = (
    source: LogStep['source'],
    tipo: LogStep['tipo'],
    titulo: string,
    detalhe: string
  ) => {
    const time = new Date().toLocaleTimeString('pt-BR');
    setLogs(prev => [
      ...prev,
      { id: Math.random().toString(), time, source, tipo, titulo, detalhe }
    ]);
  };

  const handleIniciarSimulacao = () => {
    setLogs([]);
    setFaseSimulacao('inicio');

    if (cenarioAtivo === 'novo_lead') {
      addLog(
        'CLIENTE_ZAP',
        'info',
        `Mensagem Recebida do Cliente (${numeroFicticio})`,
        `"${mensagemCliente}"`
      );

      setTimeout(() => {
        addLog(
          'EVOLUTION_WEBHOOK',
          'bot',
          'Webhook Evolution API disparado (messages.upsert)',
          `Payload capturado. Telefone: ${numeroFicticio} • Nome: ${nomeCliente}`
        );
      }, 500);

      setTimeout(() => {
        addLog(
          'CRM_ENGINE',
          'success',
          'Verificação de Base: Lead Inédito Identificado',
          `Card criado automaticamente na coluna "Novo Lead" do Funil com temperatura 🔥 Quente.`
        );
        if (onLeadSimuladoCriado) {
          onLeadSimuladoCriado({
            id: `sim_lead_${Date.now()}`,
            nome: nomeCliente,
            telefone: numeroFicticio,
            estagio: 'novo',
            temperatura: 'quente',
            ideiaProjeto: mensagemCliente,
            origem: 'whatsapp_bot'
          });
        }
      }, 1000);

      setTimeout(() => {
        const proposta = `Fala ${nomeCliente.split(' ')[0]}! Fechamento de antebraço com leão e bússola fica animal no preto e cinza com alto contraste. Para esse projeto a média fica entre R$ 850 e R$ 1.200 dependendo dos detalhes. Bora dar um pulo aqui no estúdio essa semana pra gente desenhar?`;
        setPropostaRobo(proposta);
        setEspecialistaAtivo('🤖 [Triagem · Clone do Dono]');

        addLog(
          'COPILOTO_ZAP',
          'warning',
          'Agente Clone do Dono chamou você no WhatsApp (Modo Co-Piloto)',
          `"Marquinhos, cliente pediu orçamento. Sugestão: '${proposta}'. Posso enviar? [1 - Sim / 2 - Não manda nada]"`
        );
        setFaseSimulacao('aguardando_aprovacao');
      }, 1700);
    } else if (cenarioAtivo === 'checkin_sessao') {
      addLog(
        'CRM_ENGINE',
        'info',
        'Gatilho de Check-in Ativado (Horário de término + 30 min)',
        `Sessão de ${nomeCliente} (14:00 - Leão no Braço) finalizada na agenda.`
      );

      setTimeout(() => {
        setPropostaRobo('Confirmação de Presença da Sessão');
        setEspecialistaAtivo('💉 [Check-in · Juliana Ops]');

        addLog(
          'COPILOTO_ZAP',
          'warning',
          'Juliana Ops chamou você no WhatsApp (Modo Co-Piloto)',
          `"Ei Marquinhos! A sessão de ${nomeCliente} das 14h foi concluída? Responda: 1 - Sim, tatuou / 2 - Não veio / 3 - Reagendou"`
        );
        setFaseSimulacao('aguardando_aprovacao');
      }, 800);
    } else {
      addLog(
        'CRM_ENGINE',
        'info',
        'Campanha de Reativação Segura Selecionada',
        `Cliente ${nomeCliente} está sem tatuar há 68 dias (Temperatura Esfriando).`
      );

      setTimeout(() => {
        const proposta = `Fala ${nomeCliente.split(' ')[0]}! Tudo certo por aí? Lembrei da sua tattoo aqui no estúdio. Como tá a cicatrização? Temos 2 horários VIPs essa semana se quiser fechar outro projeto com 15% de bônus!`;
        setPropostaRobo(proposta);
        setEspecialistaAtivo('🌿 [Pós-Venda & Reativação · Juliana]');

        addLog(
          'COPILOTO_ZAP',
          'warning',
          'Juliana Reativação chamou você no WhatsApp (Modo Co-Piloto)',
          `"Marquinhos, preparei mensagem de resgate para ${nomeCliente}. Posso enviar? [1 - Sim / 2 - Não manda nada]"`
        );
        setFaseSimulacao('aguardando_aprovacao');
      }, 800);
    }
  };

  const handleResponderMarquinhos = (resposta: string, isAudio = false) => {
    addLog(
      'MARQUINHOS_RESPOSTA',
      'info',
      isAudio ? 'Você enviou um ÁUDIO no WhatsApp 🎙️' : 'Você respondeu no WhatsApp',
      `"${resposta}"`
    );

    const intentResult = parseArtistWhatsAppIntent(resposta);

    setTimeout(() => {
      addLog(
        'CRM_ENGINE',
        intentResult.intent === 'APPROVE' ? 'success' : intentResult.intent === 'REJECT' ? 'warning' : 'info',
        `Intent Parser: Intenção Detectada = [${intentResult.intent}] (Confiança: ${(intentResult.confidence * 100).toFixed(0)}%)`,
        `Regra combinada: ${intentResult.matchedRule} • Ação: ${intentResult.suggestedAction}`
      );
    }, 400);

    setTimeout(() => {
      if (intentResult.intent === 'APPROVE') {
        if (cenarioAtivo === 'novo_lead' || cenarioAtivo === 'reativacao') {
          addLog(
            'DISPARO_FINAL',
            'success',
            `Mensagem Enviada ao Cliente Fictício (${numeroFicticio}) ✅`,
            `Robô disparou a resposta autorizada com sucesso. Lead movido para "Contato Feito" no CRM.`
          );
        } else {
          addLog(
            'DISPARO_FINAL',
            'success',
            `Sessão de ${nomeCliente} Marcada como CONCLUÍDA ✅`,
            `Status alterado para Verde Esmeralda no CRM. Créditos liberados e Esteira de Pós-Venda autorizada!`
          );
        }
      } else if (intentResult.intent === 'REJECT') {
        if (cenarioAtivo === 'novo_lead' || cenarioAtivo === 'reativacao') {
          addLog(
            'DISPARO_FINAL',
            'warning',
            'Envio Cancelado com Segurança 🛑',
            `O robô silenciou e NÃO enviou nada ao cliente. Mensagem no seu Zap: "Entendido Marquinhos, mensagem cancelada. Você assume."`
          );
        } else {
          addLog(
            'DISPARO_FINAL',
            'warning',
            `Sessão Marcada como NÃO COMPARECEU (No-Show) ❌`,
            `Card movido para Vermelho Rose. Agente Avalanche preparado para resgate posterior.`
          );
        }
      } else if (intentResult.intent === 'RESCHEDULE') {
        addLog(
          'DISPARO_FINAL',
          'info',
          'Sessão Movida para REAGENDADO 🔄',
          `Card atualizado para Amarelo Dourado. Aberto formulário para nova data.`
        );
      } else {
        addLog(
          'COPILOTO_ZAP',
          'warning',
          'Robô pediu confirmação adicional',
          `"Marquinhos, entendi que você disse: '${resposta}'. Pode confirmar com 1 (Aprovar) ou 2 (Não enviar)?"`
        );
      }
      setFaseSimulacao('concluido');
    }, 900);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-zinc-900 border border-zinc-700 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header do Simulador */}
        <div className="p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-500 flex items-center justify-center border border-amber-500/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-headline font-black text-white text-base">
                  Simulador Sandbox: WhatsApp &amp; Co-Piloto
                </h3>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                  Ambiente Fictício Seguro
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Teste todo o ciclo dos agentes, do WhatsApp e do Co-Piloto sem disparar mensagens reais.
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

        {/* Corpo do Simulador */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* Seletor de Cenário */}
          <div>
            <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block mb-2">
              1. Selecione o Cenário de Teste:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => { setCenarioAtivo('novo_lead'); setFaseSimulacao('inicio'); setLogs([]); }}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  cenarioAtivo === 'novo_lead'
                    ? 'bg-amber-500/10 border-amber-500 text-white shadow-xs'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm">🤖</span>
                  <span className="text-xs font-bold text-white">1. Novo Lead (Orçamento)</span>
                </div>
                <p className="text-[10px] text-zinc-400 leading-tight">
                  Lead chama no WhatsApp pedindo orçamento. Clone do Dono sugere resposta para aprovação.
                </p>
              </button>

              <button
                type="button"
                onClick={() => { setCenarioAtivo('checkin_sessao'); setFaseSimulacao('inicio'); setLogs([]); }}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  cenarioAtivo === 'checkin_sessao'
                    ? 'bg-emerald-500/10 border-emerald-500 text-white shadow-xs'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm">💉</span>
                  <span className="text-xs font-bold text-white">2. Check-in de Sessão</span>
                </div>
                <p className="text-[10px] text-zinc-400 leading-tight">
                  Sessão acaba. Juliana Ops chama você para confirmar se o cliente veio, faltou ou reagendou.
                </p>
              </button>

              <button
                type="button"
                onClick={() => { setCenarioAtivo('reativacao'); setFaseSimulacao('inicio'); setLogs([]); }}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  cenarioAtivo === 'reativacao'
                    ? 'bg-purple-500/10 border-purple-500 text-white shadow-xs'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm">🌿</span>
                  <span className="text-xs font-bold text-white">3. Campanha de Reativação</span>
                </div>
                <p className="text-[10px] text-zinc-400 leading-tight">
                  Cliente há 60 dias sem tatuar. Robô prepara mensagem com trava anti-ban da Meta.
                </p>
              </button>
            </div>
          </div>

          {/* Dados Fictícios de Entrada */}
          <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-300">Dados do Contato Fictício</span>
              <span className="text-[10px] text-zinc-500">Altere como desejar</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">Nome do Cliente Fictício</label>
                <input
                  type="text"
                  value={nomeCliente}
                  onChange={e => setNomeCliente(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">WhatsApp Fictício</label>
                <input
                  type="text"
                  value={numeroFicticio}
                  onChange={e => setNumeroFicticio(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                />
              </div>
            </div>
            {cenarioAtivo === 'novo_lead' && (
              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">Mensagem enviada pelo cliente</label>
                <input
                  type="text"
                  value={mensagemCliente}
                  onChange={e => setMensagemCliente(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
            )}

            <button
              type="button"
              onClick={handleIniciarSimulacao}
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-headline font-black text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-98"
            >
              <Play className="w-4 h-4 fill-black" />
              Disparar Simulação deste Cenário
            </button>
          </div>

          {/* Painel Central do Co-Piloto (Interação do Tatuador Marquinhos) */}
          {faseSimulacao === 'aguardando_aprovacao' && (
            <div className="bg-amber-500/10 border-2 border-amber-500/50 rounded-2xl p-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold text-amber-300">
                    Sua Central no WhatsApp acabou de receber esta notificação:
                  </span>
                </div>
                <span className="text-[10px] bg-amber-500 text-black font-black px-2 py-0.5 rounded-full">
                  AGUARDANDO SUA RESPOSTA
                </span>
              </div>

              <div className="bg-zinc-950 p-3.5 rounded-xl border border-zinc-800 text-xs text-zinc-200 mb-4 leading-relaxed font-sans">
                <p className="font-bold text-amber-400 mb-1">{especialistaAtivo}</p>
                {cenarioAtivo === 'checkin_sessao' ? (
                  <>
                    <p>Ei Marquinhos, o agendamento de <strong>{nomeCliente}</strong> (14:00) terminou!</p>
                    <p className="mt-1 text-zinc-400">Ele compareceu e realizou a tattoo?</p>
                    <div className="mt-2 text-[11px] font-mono text-zinc-300 space-y-0.5">
                      <p>1 - Sim, trabalho realizado ✅</p>
                      <p>2 - Não veio (Faltou / No-show) ❌</p>
                      <p>3 - Reagendou 🔄</p>
                    </div>
                  </>
                ) : (
                  <>
                    <p>Marquinhos, cliente <strong>{nomeCliente}</strong> perguntou sobre orçamento.</p>
                    <p className="mt-1.5 text-zinc-300 italic bg-zinc-900/80 p-2 rounded-lg border border-white/5">
                      "{propostaRobo}"
                    </p>
                    <div className="mt-2 text-[11px] font-mono text-zinc-300 space-y-0.5">
                      <p>1 - Aprovar e disparar ao cliente ✅</p>
                      <p>2 - Não manda nada (deixa comigo) 🛑</p>
                    </div>
                  </>
                )}
              </div>

              {/* Ações Rápidas de Resposta Simulada */}
              <div>
                <p className="text-[11px] font-bold text-zinc-300 mb-2">
                  Como você quer responder agora? (Escolha ou digite qualquer frase/áudio):
                </p>
                <div className="flex flex-wrap gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => handleResponderMarquinhos('1')}
                    className="px-3 py-1.5 bg-emerald-500 text-black font-bold text-xs rounded-xl hover:bg-emerald-400 transition-all flex items-center gap-1.5"
                  >
                    <span>1 (Aprovar)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleResponderMarquinhos(cenarioAtivo === 'checkin_sessao' ? 'ele veio sim' : 'pode mandar')}
                    className="px-3 py-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold text-xs rounded-xl hover:bg-emerald-500/30 transition-all"
                  >
                    <span>"{cenarioAtivo === 'checkin_sessao' ? 'ele veio sim' : 'pode mandar'}"</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleResponderMarquinhos('2')}
                    className="px-3 py-1.5 bg-rose-500 text-white font-bold text-xs rounded-xl hover:bg-rose-400 transition-all flex items-center gap-1.5"
                  >
                    <span>2 (Recusar)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleResponderMarquinhos(cenarioAtivo === 'checkin_sessao' ? 'faltou' : 'não manda nada')}
                    className="px-3 py-1.5 bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold text-xs rounded-xl hover:bg-rose-500/30 transition-all"
                  >
                    <span>"{cenarioAtivo === 'checkin_sessao' ? 'faltou' : 'não manda nada'}"</span>
                  </button>

                  {cenarioAtivo === 'checkin_sessao' && (
                    <button
                      type="button"
                      onClick={() => handleResponderMarquinhos('3')}
                      className="px-3 py-1.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold text-xs rounded-xl hover:bg-amber-500/30 transition-all"
                    >
                      <span>3 (Reagendou)</span>
                    </button>
                  )}

                  {/* Simulação de Áudio */}
                  <button
                    type="button"
                    onClick={() => handleResponderMarquinhos(cenarioAtivo === 'checkin_sessao' ? 'Opa Juliana, o Lucas veio sim e terminou a tattoo agora' : 'Ei, pode mandar essa resposta pro Lucas aí, ficou boa!', true)}
                    className="px-3 py-1.5 bg-blue-600/30 text-blue-300 border border-blue-500/40 font-bold text-xs rounded-xl hover:bg-blue-600/40 transition-all flex items-center gap-1.5"
                  >
                    <Mic className="w-3.5 h-3.5 text-blue-400" />
                    <span>Simular Áudio na Correria 🎙️</span>
                  </button>
                </div>

                {/* Input Manual Livre */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Ou digite como você falaria no WhatsApp (ex: 'manda bala', 'deixa comigo', etc.)..."
                    value={inputRespostaTatuador}
                    onChange={e => setInputRespostaTatuador(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && inputRespostaTatuador.trim()) {
                        handleResponderMarquinhos(inputRespostaTatuador.trim());
                        setInputRespostaTatuador('');
                      }
                    }}
                    className="flex-1 bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                  <button
                    type="button"
                    disabled={!inputRespostaTatuador.trim()}
                    onClick={() => {
                      handleResponderMarquinhos(inputRespostaTatuador.trim());
                      setInputRespostaTatuador('');
                    }}
                    className="px-4 py-2 bg-amber-500 text-black font-bold text-xs rounded-xl hover:bg-amber-400 disabled:opacity-50"
                  >
                    Enviar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Console de Logs em Tempo Real */}
          <div className="bg-black/90 rounded-2xl border border-zinc-800 p-4">
            <div className="flex items-center justify-between mb-3 border-b border-zinc-800 pb-2">
              <span className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Console de Execução dos Agentes &amp; Webhooks
              </span>
              <button
                type="button"
                onClick={() => setLogs([])}
                className="text-[10px] text-zinc-500 hover:text-zinc-300 font-mono"
              >
                Limpar Log
              </button>
            </div>

            {logs.length === 0 ? (
              <p className="text-xs text-zinc-600 font-mono py-4 text-center">
                Clique em "Disparar Simulação deste Cenário" acima para iniciar os testes.
              </p>
            ) : (
              <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1 font-mono text-xs">
                {logs.map(log => (
                  <div key={log.id} className="p-2.5 rounded-xl bg-zinc-900/90 border border-white/5 space-y-1">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className={`font-bold ${
                        log.tipo === 'success' ? 'text-emerald-400' :
                        log.tipo === 'warning' ? 'text-amber-400' :
                        log.tipo === 'bot' ? 'text-blue-400' : 'text-zinc-400'
                      }`}>
                        [{log.source}] • {log.titulo}
                      </span>
                      <span className="text-zinc-500">{log.time}</span>
                    </div>
                    <p className="text-zinc-300 font-sans text-xs">{log.detalhe}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-950 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Nenhum cliente real é contatado neste modo. 100% isolado para testes.</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs rounded-xl transition-all"
          >
            Fechar Simulador
          </button>
        </div>

      </div>
    </div>
  );
};
