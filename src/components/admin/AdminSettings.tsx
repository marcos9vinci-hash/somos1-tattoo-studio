// @ts-nocheck
import React, { useState } from 'react';
import { 
  Clock, ToggleLeft, ToggleRight, Ban, Trash2, Send, Settings, Minus, Plus,
  CheckCircle2, XCircle, AlertCircle, RefreshCw, QrCode, Sparkles, CalendarClock, Cake,
  UserCheck, RotateCcw, Bell, UserX, Eye, Smartphone, Power, LogOut, Check
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { whatsappService } from '../../lib/whatsappService';

interface AdminSettingsProps {
  settings: any;
  setSettings: (settings: any) => void;
  handleUpdateSettings: () => void;
  newBlock: { date: string; start: string; end: string; label: string };
  setNewBlock: (block: any) => void;
  handleAddBlock: () => void;
  handleRemoveBlock: (index: number) => void;
  onTestWhatsApp?: () => void;
}

export const AdminSettings: React.FC<AdminSettingsProps> = ({
  settings,
  setSettings,
  handleUpdateSettings,
  newBlock,
  setNewBlock,
  handleAddBlock,
  handleRemoveBlock,
  onTestWhatsApp
}) => {
  const [isCheckingConnection, setIsCheckingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{ connected: boolean; state: string; message?: string } | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [isLoadingQr, setIsLoadingQr] = useState(false);
  const [isAlreadyConnected, setIsAlreadyConnected] = useState(false);
  const [connectedInfo, setConnectedInfo] = useState<{ number?: string; profile?: string } | null>(null);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [previewTemplateKey, setPreviewTemplateKey] = useState<string | null>(null);

  // Modelos com texto pré-escrito completo profissional padrão
  const DEFAULT_PREWRITTEN_TEMPLATES: Record<string, string> = {
    confirmacao: "✅ Olá, {cliente}! Tudo bem? Confirmamos o seu agendamento no Somos 1 Tattoo Studio para o dia {data} às {horario} com {profissional} ({servico}). Se precisar de qualquer orientação prévia, estamos à disposição!",
    reagendamento: "🗓️ Olá, {cliente}! Informamos que seu agendamento foi REAGENDADO com sucesso para a nova data: {data} às {horario} com {profissional} ({servico}). Nos vemos em breve!",
    cancelamento: "❌ Olá, {cliente}. Confirmamos o cancelamento da sua sessão do dia {data} às {horario}. Se desejar reagendar para outra data futura, estamos à total disposição!",
    lembrete: "⏰ Olá, {cliente}! Passando para lembrar da nossa sessão amanhã dia {data} às {horario} ({servico}). Venha descansado(a) e bem alimentado(a). Nos vemos em breve no estúdio!",
    followup: "✨ Olá, {cliente}! Passando para acompanhar a cicatrização da sua arte realizada dia {data}. Está tudo correndo bem com os cuidados e hidratação? Se precisar de qualquer orientação, conte conosco!",
    aniversario: "🎂 Parabéns, {cliente}! O Somos 1 Tattoo Studio te deseja um feliz aniversário! Preparamos um presente especial: use o cupom {cupom} e ganhe um desconto exclusivo na sua próxima tattoo ou piercing!",
    reativacao: "🔥 Fala, {primeiro_nome}! Faz um tempinho que você não passa aqui no Somos 1 Tattoo Studio. Que tal tirar aquele novo projeto do papel? Respondendo a essa mensagem você garante uma condição especial e prioridade na agenda!",
    retorno: "🌿 Oi, {primeiro_nome}! Passando para acompanhar o resultado da sua arte e verificar se já está na hora daquele retoque ou sessão de acompanhamento para deixar sua tattoo perfeita. Vamos agendar seu retorno?",
    lista_espera: "⚡ Olá, {primeiro_nome}! Uma vaga acabou de abrir na agenda para o dia {data} às {horario} com {profissional}. Como você estava na nossa lista de espera, tem prioridade para garantir esse horário. Deseja confirmar?"
  };

  const templateConfigs = [
    {
      key: 'confirmacao',
      label: 'Confirmação',
      badge: 'Imediato',
      icon: CheckCircle2,
      color: 'text-emerald-400',
      border: 'border-emerald-500/20',
      bgBadge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      hint: 'Disparado na hora em que o agendamento é salvo ou aprovado.'
    },
    {
      key: 'reagendamento',
      label: 'Reagendamento',
      badge: 'Ao Reagendar',
      icon: RotateCcw,
      color: 'text-amber-400',
      border: 'border-amber-500/20',
      bgBadge: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      hint: 'Disparado automaticamente quando a data ou horário for alterado.'
    },
    {
      key: 'cancelamento',
      label: 'Cancelamento',
      badge: 'Ao Cancelar',
      icon: Ban,
      color: 'text-red-400',
      border: 'border-red-500/20',
      bgBadge: 'bg-red-500/10 text-red-400 border-red-500/30',
      hint: 'Disparado quando uma sessão é desmarcada ou cancelada.'
    },
    {
      key: 'lembrete',
      label: 'Lembrete',
      badge: 'Pré-Sessão',
      icon: Clock,
      color: 'text-cyan-400',
      border: 'border-cyan-500/20',
      bgBadge: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
      hint: 'Disparado automaticamente com o tempo configurado antes da sessão.'
    },
    {
      key: 'followup',
      label: 'Follow-up',
      badge: 'Pós-Sessão',
      icon: Sparkles,
      color: 'text-purple-400',
      border: 'border-purple-500/20',
      bgBadge: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
      hint: 'Disparado após a sessão para acompanhar o cliente e cicatrização.'
    },
    {
      key: 'aniversario',
      label: 'Aniversário',
      badge: 'No Dia Especial',
      icon: Cake,
      color: 'text-pink-400',
      border: 'border-pink-500/20',
      bgBadge: 'bg-pink-500/10 text-pink-400 border-pink-500/30',
      hint: 'Disparado no dia do aniversário do cliente com cupom de presente.'
    },
    {
      key: 'reativacao',
      label: 'Reativação (Clientes Sumidos)',
      badge: 'Inatividade',
      icon: UserX,
      color: 'text-orange-400',
      border: 'border-orange-500/20',
      bgBadge: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
      hint: 'Disparado para clientes sem agendamento há mais de X dias.'
    },
    {
      key: 'retorno',
      label: 'Retorno / Retoque',
      badge: 'Pós-Cicatrização',
      icon: CalendarClock,
      color: 'text-emerald-300',
      border: 'border-emerald-400/20',
      bgBadge: 'bg-emerald-400/10 text-emerald-300 border-emerald-400/30',
      hint: 'Disparado X dias após o procedimento para revisão ou retoque da arte.'
    },
    {
      key: 'lista_espera',
      label: 'Lista de Espera',
      badge: 'Vagas Liberadas',
      icon: Bell,
      color: 'text-yellow-400',
      border: 'border-yellow-500/20',
      bgBadge: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
      hint: 'Disparado para contatos em espera quando há desistência de horário.'
    }
  ];

  const availableTags = [
    { label: '{cliente}', desc: 'Nome completo' },
    { label: '{primeiro_nome}', desc: 'Primeiro nome' },
    { label: '{data}', desc: 'Data do agendamento' },
    { label: '{horario}', desc: 'Horário' },
    { label: '{servico}', desc: 'Serviço/Procedimento' },
    { label: '{profissional}', desc: 'Tatuador' },
    { label: '{cupom}', desc: 'Código de cupom' },
    { label: '{dias_sem_vir}', desc: 'Dias sem agendar' }
  ];

  const insertTagIntoTemplate = (key: string, tag: string) => {
    const current = settings.whatsappTemplates?.[key] !== undefined 
      ? settings.whatsappTemplates[key] 
      : (DEFAULT_PREWRITTEN_TEMPLATES[key] || "");
    setSettings({
      ...settings,
      whatsappTemplates: {
        ...settings.whatsappTemplates,
        [key]: current ? `${current} ${tag}` : tag
      }
    });
  };

  const renderPreviewText = (text: string) => {
    if (!text) return "";
    return text
      .replace(/{cliente}/g, "Marcos Vinci")
      .replace(/{primeiro_nome}/g, "Marcos")
      .replace(/{data}/g, "28/09/2026")
      .replace(/{horario}/g, "15:00")
      .replace(/{servico}/g, "Tatuagem Realista")
      .replace(/{profissional}/g, "Markinhos")
      .replace(/{cupom}/g, "VIPNIVER")
      .replace(/{dias_sem_vir}/g, "45");
  };

  const handleCheckConnection = async () => {
    setIsCheckingConnection(true);
    try {
      const res = await whatsappService.checkInstanceConnection(settings);
      setConnectionStatus(res);
    } catch (err: any) {
      setConnectionStatus({ connected: false, state: 'error', message: err.message });
    } finally {
      setIsCheckingConnection(false);
    }
  };

  const handleOpenQrModal = async () => {
    setShowQrModal(true);
    setIsLoadingQr(true);
    setQrCodeData(null);
    setPairingCode(null);
    setIsAlreadyConnected(false);
    try {
      const res = await whatsappService.fetchInstanceQrCode(settings);
      if (res.alreadyConnected) {
        setIsAlreadyConnected(true);
        setConnectedInfo({
          number: res.connectedNumber,
          profile: res.profileName
        });
      } else {
        if (res.qrCodeBase64 || res.base64) {
          setQrCodeData(res.qrCodeBase64 || res.base64);
        }
        if (res.pairingCode) {
          setPairingCode(res.pairingCode);
        }
      }
    } catch (err: any) {
      console.error("Erro ao buscar QR code:", err);
    } finally {
      setIsLoadingQr(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Deseja realmente desconectar o WhatsApp desta instância para conectar um novo aparelho?")) return;
    setIsDisconnecting(true);
    try {
      await whatsappService.logoutInstance(settings);
      setIsAlreadyConnected(false);
      setConnectedInfo(null);
      await handleOpenQrModal();
    } catch (err) {
      console.error("Erro ao desconectar:", err);
    } finally {
      setIsDisconnecting(false);
    }
  };

  return (
    <div className="space-y-12">
      
      {/* =========================================================================
          SEÇÃO 1: MODELOS DE MENSAGEM (WHATSAPP) COM TEXTOS PRÉ-ESCRITOS
         ========================================================================= */}
      <div className="space-y-6 pt-2">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="font-headline text-lg text-white uppercase flex items-center gap-2 font-bold">
              <Send className="w-5 h-5 text-emerald-400" />
              Modelos de Mensagem (WhatsApp)
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              Todos os modelos vêm pré-escritos para uso imediato. Edite o texto como desejar e clique em salvar.
            </p>
          </div>

          {/* Quick Tag Pills Helper */}
          <div className="flex flex-wrap items-center gap-1.5 bg-black/40 border border-white/5 p-2 rounded-xl">
            <span className="text-[10px] text-zinc-500 uppercase font-headline tracking-wider mr-1">Tags:</span>
            {availableTags.map((tag) => (
              <span 
                key={tag.label}
                title={tag.desc}
                className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-zinc-300 font-mono text-[10px]"
              >
                {tag.label}
              </span>
            ))}
          </div>
        </div>

        {/* Grade Responsiva com os 9 Modelos */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templateConfigs.map((tpl) => {
            const Icon = tpl.icon;
            // Usa o valor personalizado ou o texto padrão pré-escrito
            const currentVal = settings.whatsappTemplates?.[tpl.key] !== undefined
              ? settings.whatsappTemplates[tpl.key]
              : (DEFAULT_PREWRITTEN_TEMPLATES[tpl.key] || "");
            const isPreviewing = previewTemplateKey === tpl.key;

            return (
              <div 
                key={tpl.key} 
                className={cn(
                  "bg-black/50 border rounded-2xl p-5 flex flex-col justify-between space-y-4 transition-all duration-200 hover:border-white/20 shadow-lg",
                  tpl.border
                )}
              >
                {/* Header do Card */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className={cn("w-4 h-4", tpl.color)} />
                      <label className="text-xs uppercase font-headline font-bold text-white tracking-wider">
                        {tpl.label}
                      </label>
                    </div>
                    <span className={cn("px-2 py-0.5 rounded text-[8px] font-black uppercase border tracking-wider", tpl.bgBadge)}>
                      {tpl.badge}
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-400 leading-relaxed">
                    {tpl.hint}
                  </p>
                </div>

                {/* Textarea com Conteúdo Pré-Escrito ou Simulador */}
                <div className="space-y-2">
                  {isPreviewing ? (
                    <div className="bg-[#121b22] border border-[#233138] rounded-xl p-3 min-h-[140px] flex flex-col justify-between relative shadow-inner">
                      <div className="bg-[#005c4b] text-white text-xs p-2.5 rounded-lg rounded-tl-none font-sans leading-relaxed whitespace-pre-wrap">
                        {renderPreviewText(currentVal)}
                        <div className="flex items-center justify-end gap-1 text-[9px] text-zinc-300 mt-1 font-mono">
                          <span>10:30</span>
                          <span className="text-[#53bdeb] font-bold">✓✓</span>
                        </div>
                      </div>
                      <span className="text-[9px] text-zinc-400 italic text-center mt-2">
                        Simulação do visual no WhatsApp
                      </span>
                    </div>
                  ) : (
                    <textarea
                      value={currentVal}
                      onChange={(e) => setSettings({
                        ...settings,
                        whatsappTemplates: {
                          ...settings.whatsappTemplates,
                          [tpl.key]: e.target.value
                        }
                      })}
                      className="w-full bg-black/70 border border-white/10 rounded-xl p-3 text-white text-xs h-36 focus:outline-none focus:border-primary-fixed leading-relaxed font-sans placeholder:text-zinc-600 resize-none transition-all shadow-inner"
                    />
                  )}
                </div>

                {/* Controles de Tag e Prévia */}
                <div className="space-y-2 pt-2 border-t border-white/5">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-wrap gap-1">
                      <button
                        type="button"
                        onClick={() => insertTagIntoTemplate(tpl.key, '{cliente}')}
                        className="px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 text-[9px] font-mono text-zinc-400 hover:text-white transition-all"
                      >
                        +{'{cliente}'}
                      </button>
                      <button
                        type="button"
                        onClick={() => insertTagIntoTemplate(tpl.key, '{data}')}
                        className="px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 text-[9px] font-mono text-zinc-400 hover:text-white transition-all"
                      >
                        +{'{data}'}
                      </button>
                      <button
                        type="button"
                        onClick={() => insertTagIntoTemplate(tpl.key, '{horario}')}
                        className="px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 text-[9px] font-mono text-zinc-400 hover:text-white transition-all"
                      >
                        +{'{horario}'}
                      </button>
                      {tpl.key === 'aniversario' && (
                        <button
                          type="button"
                          onClick={() => insertTagIntoTemplate(tpl.key, '{cupom}')}
                          className="px-1.5 py-0.5 rounded bg-pink-500/20 hover:bg-pink-500/30 text-[9px] font-mono text-pink-300 transition-all"
                        >
                          +{'{cupom}'}
                        </button>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => setPreviewTemplateKey(isPreviewing ? null : tpl.key)}
                      className={cn(
                        "p-1.5 rounded-lg border text-[10px] font-headline uppercase flex items-center gap-1 transition-all",
                        isPreviewing 
                          ? "bg-primary-fixed text-black border-primary-fixed font-bold" 
                          : "bg-white/5 border-white/10 text-zinc-400 hover:text-white"
                      )}
                      title={isPreviewing ? "Voltar à edição" : "Ver como fica no WhatsApp"}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      {isPreviewing ? "Editar" : "Prévia"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>


      {/* =========================================================================
          SEÇÃO 2: AUTOMAÇÃO EVOLUTION API COM BOTÕES DE ATIVAÇÃO ON/OFF E TEMPOS
         ========================================================================= */}
      <div className="space-y-6 pt-8 border-t border-white/10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="font-headline text-lg text-white uppercase flex items-center gap-2 font-bold">
              <Settings className="w-5 h-5 text-blue-500" />
              Automação Evolution API
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              Ligue ou desligue cada envio com os botões de ativação e ajuste o tempo exato de cada gatilho.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Status Button */}
            <button
              type="button"
              onClick={handleCheckConnection}
              disabled={isCheckingConnection}
              className="px-3.5 py-2 rounded-xl border border-white/10 bg-zinc-900 text-zinc-300 font-headline text-[10px] uppercase font-bold hover:bg-white/5 hover:text-white transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              <RefreshCw className={cn("w-3.5 h-3.5 text-blue-400", isCheckingConnection && "animate-spin")} />
              {isCheckingConnection ? "Checando..." : "Status Conexão"}
            </button>

            {/* QR Code Button */}
            <button
              type="button"
              onClick={handleOpenQrModal}
              className="px-3.5 py-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 font-headline text-[10px] uppercase font-bold hover:bg-emerald-500/20 transition-all flex items-center gap-1.5"
            >
              <QrCode className="w-3.5 h-3.5" />
              Conectar WhatsApp
            </button>

            {/* Test Send Button */}
            <button
              type="button"
              onClick={onTestWhatsApp}
              className="px-3.5 py-2 rounded-xl border border-blue-500/30 bg-blue-500/10 text-blue-400 font-headline text-[10px] uppercase font-bold hover:bg-blue-500/20 transition-all flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              Testar Envio
            </button>

            {/* Master Active Toggle */}
            <button
              type="button"
              onClick={() => setSettings({
                ...settings,
                automation: { ...settings.automation, enabled: !settings.automation?.enabled }
              })}
              className={cn(
                "px-3.5 py-2 rounded-xl text-[10px] font-black uppercase border transition-all flex items-center gap-1.5",
                settings.automation?.enabled !== false 
                  ? "bg-green-500/10 border-green-500/30 text-green-400" 
                  : "bg-zinc-800 border-white/5 text-zinc-500"
              )}
            >
              <Power className="w-3.5 h-3.5" />
              {settings.automation?.enabled !== false ? "ROBÔ GERAL LIGADO" : "ROBÔ GERAL DESLIGADO"}
            </button>
          </div>
        </div>

        {/* Live Status Toast Banner */}
        {connectionStatus && (
          <div className={cn(
            "p-3 rounded-xl border flex items-center justify-between text-xs",
            connectionStatus.connected 
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
              : "bg-red-500/10 border-red-500/30 text-red-300"
          )}>
            <div className="flex items-center gap-2">
              {connectionStatus.connected ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              <span>{connectionStatus.message || (connectionStatus.connected ? "Instância Evolution conectada e operante!" : "Instância desconectada.")}</span>
            </div>
            <button 
              type="button" 
              onClick={() => setConnectionStatus(null)}
              className="text-[10px] uppercase font-headline hover:underline"
            >
              Fechar
            </button>
          </div>
        )}

        {/* Evolution API Credentials Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-white/[0.02] p-5 rounded-2xl border border-white/5">
          <div className="space-y-2">
            <label className="text-[10px] uppercase font-headline text-zinc-500 block tracking-widest">Base URL</label>
            <input
              type="text"
              value={settings.automation?.evolutionBaseUrl || ""}
              onChange={(e) => setSettings({
                ...settings,
                automation: { ...settings.automation, evolutionBaseUrl: e.target.value }
              })}
              placeholder="https://sua-evolution-api.com"
              className="w-full bg-black border border-white/10 rounded-xl p-3 text-white text-xs focus:outline-none focus:border-primary-fixed font-mono"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] uppercase font-headline text-zinc-500 block tracking-widest">API Key</label>
            <input
              type="password"
              value={settings.automation?.evolutionApiKey || ""}
              onChange={(e) => setSettings({
                ...settings,
                automation: { ...settings.automation, evolutionApiKey: e.target.value }
              })}
              placeholder="Sua chave secreta"
              className="w-full bg-black border border-white/10 rounded-xl p-3 text-white text-xs focus:outline-none focus:border-primary-fixed font-mono"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] uppercase font-headline text-zinc-500 block tracking-widest">Instância</label>
            <input
              type="text"
              value={settings.automation?.evolutionInstance || ""}
              onChange={(e) => setSettings({
                ...settings,
                automation: { ...settings.automation, evolutionInstance: e.target.value }
              })}
              placeholder="Nome da Instância (ex: wats)"
              className="w-full bg-black border border-white/10 rounded-xl p-3 text-white text-xs focus:outline-none focus:border-primary-fixed font-mono"
            />
          </div>
        </div>

        {/* Grade com os 7 Gatilhos & Tempos com Botões de Ativação Claros */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* 1. Confirmação Automática */}
          <div className="space-y-4 bg-white/5 p-5 rounded-2xl border border-white/5 flex flex-col justify-between">
            <div className="flex justify-between items-center">
              <label className="text-[11px] uppercase font-headline font-bold text-white tracking-wider">
                Confirmação Automática
              </label>
              <button
                type="button"
                onClick={() => setSettings({
                  ...settings,
                  automation: { ...settings.automation, confirmationEnabled: !settings.automation?.confirmationEnabled }
                })}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-[9px] font-black uppercase border transition-all flex items-center gap-1.5 shadow-sm",
                  settings.automation?.confirmationEnabled 
                    ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400 font-bold" 
                    : "bg-zinc-800 border-white/10 text-zinc-400 hover:text-white"
                )}
              >
                <span className={cn("w-2 h-2 rounded-full", settings.automation?.confirmationEnabled ? "bg-emerald-400" : "bg-zinc-600")} />
                {settings.automation?.confirmationEnabled ? "ATIVADO" : "DESATIVADO"}
              </button>
            </div>
            <p className="text-[10px] text-zinc-400 italic">
              Dispara a confirmação no WhatsApp na hora em que o agendamento é salvo ou aprovado.
            </p>
          </div>

          {/* 2. Tempo de Lembrete */}
          <div className="space-y-4 bg-white/5 p-5 rounded-2xl border border-white/5 flex flex-col justify-between">
            <div className="flex justify-between items-center mb-2">
              <div className="flex flex-col">
                <label className="text-[11px] uppercase font-headline font-bold text-white tracking-wider">
                  Tempo de Lembrete
                </label>
                <button
                  type="button"
                  onClick={() => setSettings({
                    ...settings,
                    automation: { ...settings.automation, reminderEnabled: !settings.automation?.reminderEnabled }
                  })}
                  className={cn(
                    "mt-1 px-2.5 py-1 rounded-lg text-[8px] font-black uppercase border w-fit transition-all flex items-center gap-1",
                    settings.automation?.reminderEnabled 
                      ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400" 
                      : "bg-zinc-800 border-white/10 text-zinc-400"
                  )}
                >
                  <span className={cn("w-1.5 h-1.5 rounded-full", settings.automation?.reminderEnabled ? "bg-emerald-400" : "bg-zinc-600")} />
                  {settings.automation?.reminderEnabled ? "ATIVADO" : "DESATIVADO"}
                </button>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center bg-black border border-white/10 rounded-xl overflow-hidden h-10">
                  <button
                    type="button"
                    onClick={() => setSettings({
                      ...settings,
                      automation: { ...settings.automation, reminderValue: Math.max(1, (settings.automation?.reminderValue || 1) - 1) }
                    })}
                    className="px-3 hover:bg-white/5 text-zinc-400"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-8 text-center text-primary-fixed font-black text-sm">
                    {settings.automation?.reminderValue ?? 24}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSettings({
                      ...settings,
                      automation: { ...settings.automation, reminderValue: (settings.automation?.reminderValue || 1) + 1 }
                    })}
                    className="px-3 hover:bg-white/5 text-zinc-400"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
                <select
                  value={settings.automation?.reminderUnit || 'hours'}
                  onChange={(e) => setSettings({
                    ...settings,
                    automation: { ...settings.automation, reminderUnit: e.target.value }
                  })}
                  className="bg-black text-[10px] text-zinc-400 p-2.5 rounded-xl border border-white/10 font-headline uppercase"
                >
                  <option value="minutes">Minutos</option>
                  <option value="hours">Horas</option>
                  <option value="days">Dias</option>
                </select>
              </div>
            </div>
            <p className="text-[10px] text-zinc-400 italic">
              Dica: Lembretes costumam funcionar bem com 24 horas de antecedência.
            </p>
          </div>

          {/* 3. Tempo de Follow-up */}
          <div className="space-y-4 bg-white/5 p-5 rounded-2xl border border-white/5 flex flex-col justify-between">
            <div className="flex justify-between items-center mb-2">
              <div className="flex flex-col">
                <label className="text-[11px] uppercase font-headline font-bold text-white tracking-wider">
                  Tempo de Follow-up
                </label>
                <button
                  type="button"
                  onClick={() => setSettings({
                    ...settings,
                    automation: { ...settings.automation, followUpEnabled: !settings.automation?.followUpEnabled }
                  })}
                  className={cn(
                    "mt-1 px-2.5 py-1 rounded-lg text-[8px] font-black uppercase border w-fit transition-all flex items-center gap-1",
                    settings.automation?.followUpEnabled 
                      ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400" 
                      : "bg-zinc-800 border-white/10 text-zinc-400"
                  )}
                >
                  <span className={cn("w-1.5 h-1.5 rounded-full", settings.automation?.followUpEnabled ? "bg-emerald-400" : "bg-zinc-600")} />
                  {settings.automation?.followUpEnabled ? "ATIVADO" : "DESATIVADO"}
                </button>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center bg-black border border-white/10 rounded-xl overflow-hidden h-10">
                  <button
                    type="button"
                    onClick={() => setSettings({
                      ...settings,
                      automation: { ...settings.automation, followUpValue: Math.max(1, (settings.automation?.followUpValue || 1) - 1) }
                    })}
                    className="px-3 hover:bg-white/5 text-zinc-400"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-8 text-center text-primary-fixed font-black text-sm">
                    {settings.automation?.followUpValue ?? 7}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSettings({
                      ...settings,
                      automation: { ...settings.automation, followUpValue: (settings.automation?.followUpValue || 1) + 1 }
                    })}
                    className="px-3 hover:bg-white/5 text-zinc-400"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
                <select
                  value={settings.automation?.followUpUnit || 'days'}
                  onChange={(e) => setSettings({
                    ...settings,
                    automation: { ...settings.automation, followUpUnit: e.target.value }
                  })}
                  className="bg-black text-[10px] text-zinc-400 p-2.5 rounded-xl border border-white/10 font-headline uppercase"
                >
                  <option value="minutes">Minutos</option>
                  <option value="hours">Horas</option>
                  <option value="days">Dias</option>
                </select>
              </div>
            </div>
            <p className="text-[10px] text-zinc-400 italic">
              Dica: Follow-up para cicatrização é ideal entre 3 a 7 dias após o atendimento.
            </p>
          </div>

          {/* 4. Tempo de Reativação (Clientes Sumidos) */}
          <div className="space-y-4 bg-white/5 p-5 rounded-2xl border border-white/5 flex flex-col justify-between">
            <div className="flex justify-between items-center mb-2">
              <div className="flex flex-col">
                <label className="text-[11px] uppercase font-headline font-bold text-white tracking-wider">
                  Tempo de Reativação
                </label>
                <button
                  type="button"
                  onClick={() => setSettings({
                    ...settings,
                    automation: { ...settings.automation, reactivationEnabled: !settings.automation?.reactivationEnabled }
                  })}
                  className={cn(
                    "mt-1 px-2.5 py-1 rounded-lg text-[8px] font-black uppercase border w-fit transition-all flex items-center gap-1",
                    settings.automation?.reactivationEnabled 
                      ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400" 
                      : "bg-zinc-800 border-white/10 text-zinc-400"
                  )}
                >
                  <span className={cn("w-1.5 h-1.5 rounded-full", settings.automation?.reactivationEnabled ? "bg-emerald-400" : "bg-zinc-600")} />
                  {settings.automation?.reactivationEnabled ? "ATIVADO" : "DESATIVADO"}
                </button>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center bg-black border border-white/10 rounded-xl overflow-hidden h-10">
                  <button
                    type="button"
                    onClick={() => setSettings({
                      ...settings,
                      automation: { 
                        ...settings.automation, 
                        reactivationValue: Math.max(1, (settings.automation?.reactivationValue || settings.automation?.reactivationDays || 45) - 5),
                        reactivationDays: Math.max(1, (settings.automation?.reactivationValue || settings.automation?.reactivationDays || 45) - 5)
                      }
                    })}
                    className="px-3 hover:bg-white/5 text-zinc-400"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-8 text-center text-primary-fixed font-black text-sm">
                    {settings.automation?.reactivationValue ?? settings.automation?.reactivationDays ?? 45}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSettings({
                      ...settings,
                      automation: { 
                        ...settings.automation, 
                        reactivationValue: (settings.automation?.reactivationValue || settings.automation?.reactivationDays || 45) + 5,
                        reactivationDays: (settings.automation?.reactivationValue || settings.automation?.reactivationDays || 45) + 5
                      }
                    })}
                    className="px-3 hover:bg-white/5 text-zinc-400"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
                <select
                  value={settings.automation?.reactivationUnit || 'days'}
                  onChange={(e) => setSettings({
                    ...settings,
                    automation: { ...settings.automation, reactivationUnit: e.target.value }
                  })}
                  className="bg-black text-[10px] text-zinc-400 p-2.5 rounded-xl border border-white/10 font-headline uppercase"
                >
                  <option value="days">Dias</option>
                  <option value="hours">Horas</option>
                </select>
              </div>
            </div>
            <p className="text-[10px] text-zinc-400 italic">
              Dica: Reativação automática com oferta VIP para quem não agenda há X dias (ex: 45 dias).
            </p>
          </div>

          {/* 5. Tempo de Retorno / Retoque */}
          <div className="space-y-4 bg-white/5 p-5 rounded-2xl border border-white/5 flex flex-col justify-between">
            <div className="flex justify-between items-center mb-2">
              <div className="flex flex-col">
                <label className="text-[11px] uppercase font-headline font-bold text-white tracking-wider">
                  Tempo de Retorno / Retoque
                </label>
                <button
                  type="button"
                  onClick={() => setSettings({
                    ...settings,
                    automation: { ...settings.automation, returningEnabled: !settings.automation?.returningEnabled }
                  })}
                  className={cn(
                    "mt-1 px-2.5 py-1 rounded-lg text-[8px] font-black uppercase border w-fit transition-all flex items-center gap-1",
                    settings.automation?.returningEnabled 
                      ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400" 
                      : "bg-zinc-800 border-white/10 text-zinc-400"
                  )}
                >
                  <span className={cn("w-1.5 h-1.5 rounded-full", settings.automation?.returningEnabled ? "bg-emerald-400" : "bg-zinc-600")} />
                  {settings.automation?.returningEnabled ? "ATIVADO" : "DESATIVADO"}
                </button>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center bg-black border border-white/10 rounded-xl overflow-hidden h-10">
                  <button
                    type="button"
                    onClick={() => setSettings({
                      ...settings,
                      automation: { 
                        ...settings.automation, 
                        returningValue: Math.max(1, (settings.automation?.returningValue || settings.automation?.returningDays || 30) - 5),
                        returningDays: Math.max(1, (settings.automation?.returningValue || settings.automation?.returningDays || 30) - 5)
                      }
                    })}
                    className="px-3 hover:bg-white/5 text-zinc-400"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-8 text-center text-primary-fixed font-black text-sm">
                    {settings.automation?.returningValue ?? settings.automation?.returningDays ?? 30}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSettings({
                      ...settings,
                      automation: { 
                        ...settings.automation, 
                        returningValue: (settings.automation?.returningValue || settings.automation?.returningDays || 30) + 5,
                        returningDays: (settings.automation?.returningValue || settings.automation?.returningDays || 30) + 5
                      }
                    })}
                    className="px-3 hover:bg-white/5 text-zinc-400"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
                <select
                  value={settings.automation?.returningUnit || 'days'}
                  onChange={(e) => setSettings({
                    ...settings,
                    automation: { ...settings.automation, returningUnit: e.target.value }
                  })}
                  className="bg-black text-[10px] text-zinc-400 p-2.5 rounded-xl border border-white/10 font-headline uppercase"
                >
                  <option value="days">Dias</option>
                  <option value="hours">Horas</option>
                </select>
              </div>
            </div>
            <p className="text-[10px] text-zinc-400 italic">
              Dica: Convite automático para retoque da tattoo ou nova arte após a cicatrização completa.
            </p>
          </div>

          {/* 6. Disparo de Aniversário */}
          <div className="space-y-4 bg-white/5 p-5 rounded-2xl border border-white/5 flex flex-col justify-between">
            <div className="flex justify-between items-center">
              <label className="text-[11px] uppercase font-headline font-bold text-white tracking-wider">
                Mensagem de Aniversário
              </label>
              <button
                type="button"
                onClick={() => setSettings({
                  ...settings,
                  automation: { ...settings.automation, birthdayEnabled: !settings.automation?.birthdayEnabled }
                })}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-[9px] font-black uppercase border transition-all flex items-center gap-1.5 shadow-sm",
                  settings.automation?.birthdayEnabled 
                    ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400 font-bold" 
                    : "bg-zinc-800 border-white/10 text-zinc-400 hover:text-white"
                )}
              >
                <span className={cn("w-2 h-2 rounded-full", settings.automation?.birthdayEnabled ? "bg-emerald-400" : "bg-zinc-600")} />
                {settings.automation?.birthdayEnabled ? "ATIVADO" : "DESATIVADO"}
              </button>
            </div>
            <p className="text-[10px] text-zinc-400 italic">
              Dispara no dia do aniversário do cliente às 09:00 com cupom de presente no estúdio.
            </p>
          </div>

          {/* 7. Alerta de Lista de Espera */}
          <div className="space-y-4 bg-white/5 p-5 rounded-2xl border border-white/5 flex flex-col justify-between">
            <div className="flex justify-between items-center">
              <label className="text-[11px] uppercase font-headline font-bold text-white tracking-wider">
                Alerta de Lista de Espera
              </label>
              <button
                type="button"
                onClick={() => setSettings({
                  ...settings,
                  automation: { ...settings.automation, waitingListEnabled: !settings.automation?.waitingListEnabled }
                })}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-[9px] font-black uppercase border transition-all flex items-center gap-1.5 shadow-sm",
                  settings.automation?.waitingListEnabled 
                    ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400 font-bold" 
                    : "bg-zinc-800 border-white/10 text-zinc-400 hover:text-white"
                )}
              >
                <span className={cn("w-2 h-2 rounded-full", settings.automation?.waitingListEnabled ? "bg-emerald-400" : "bg-zinc-600")} />
                {settings.automation?.waitingListEnabled ? "ATIVADO" : "DESATIVADO"}
              </button>
            </div>
            <p className="text-[10px] text-zinc-400 italic">
              Avisa contatos em espera caso ocorra cancelamento ou liberação de horário na agenda.
            </p>
          </div>

        </div>
      </div>


      {/* =========================================================================
          SEÇÃO 3: DURAÇÃO PADRÃO DOS TRABALHOS (MINUTOS)
         ========================================================================= */}
      <div className="space-y-4 pt-8 border-t border-white/10">
        <h3 className="font-headline text-lg text-white uppercase flex items-center gap-2 font-bold">
          <Clock className="w-5 h-5 text-primary-fixed" />
          Duração Padrão dos Trabalhos (Minutos)
        </h3>
        <p className="text-xs text-zinc-400">
          Define o tempo de duração reservado na agenda para cada porte de procedimento ou tattoo.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {(['Pequena', 'Média', 'Grande'] as const).map(size => {
            const currentDuration = settings.durations?.[size] ?? (size === 'Pequena' ? 60 : size === 'Média' ? 120 : 240);
            return (
              <div key={size} className="bg-white/5 p-4 rounded-2xl border border-white/5 space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-xs uppercase font-headline font-bold text-white tracking-wider">
                    Tattoo {size}
                  </label>
                  <span className="text-[10px] text-zinc-500 uppercase font-mono">
                    {Math.floor(currentDuration / 60)}h {currentDuration % 60 > 0 ? `${currentDuration % 60}m` : ''}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center bg-black border border-white/10 rounded-xl overflow-hidden h-11 w-full">
                    <button
                      type="button"
                      onClick={() => setSettings({
                        ...settings,
                        durations: {
                          ...settings.durations,
                          [size]: Math.max(15, currentDuration - 15)
                        }
                      })}
                      className="px-3 hover:bg-white/5 text-zinc-400"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <input 
                      type="number"
                      value={currentDuration}
                      onChange={(e) => setSettings({
                        ...settings,
                        durations: {
                          ...settings.durations,
                          [size]: parseInt(e.target.value) || 30
                        }
                      })}
                      className="w-full bg-transparent text-center text-primary-fixed font-black text-sm focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setSettings({
                        ...settings,
                        durations: {
                          ...settings.durations,
                          [size]: currentDuration + 15
                        }
                      })}
                      className="px-3 hover:bg-white/5 text-zinc-400"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <span className="text-xs text-zinc-500 uppercase font-headline font-bold pr-2">min</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>


      {/* =========================================================================
          SEÇÃO 4: BLOQUEIOS DE HORÁRIOS DA AGENDA (UNIFICADO)
         ========================================================================= */}
      <div className="space-y-4 pt-8 border-t border-white/10">
        <h3 className="font-headline text-lg text-white uppercase flex items-center gap-2 font-bold">
          <Ban className="w-5 h-5 text-red-500" />
          Bloqueios de Horários da Agenda
        </h3>
        <p className="text-xs text-zinc-400">
          Bloqueie dias ou faixas de horários para folgas, almoço ou manutenção. Clique nos campos de data e hora para abrir o seletor completo.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white/5 p-5 rounded-2xl border border-white/5">
          <div className="space-y-1">
            <label className="text-[10px] text-zinc-400 uppercase font-headline tracking-wider">Data do Bloqueio</label>
            <input
              type="date"
              value={newBlock.date}
              onClick={(e) => { try { e.currentTarget.showPicker(); } catch {} }}
              onChange={(e) => setNewBlock({ ...newBlock, date: e.target.value })}
              className="w-full bg-black border border-white/10 rounded-xl p-3 text-white text-xs cursor-pointer hover:border-white/30 transition-all font-mono"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] text-zinc-400 uppercase font-headline tracking-wider">Hora Início</label>
            <input
              type="time"
              value={newBlock.start}
              onClick={(e) => { try { e.currentTarget.showPicker(); } catch {} }}
              onChange={(e) => setNewBlock({ ...newBlock, start: e.target.value })}
              className="w-full bg-black border border-white/10 rounded-xl p-3 text-white text-xs cursor-pointer hover:border-white/30 transition-all font-mono"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] text-zinc-400 uppercase font-headline tracking-wider">Hora Fim</label>
            <input
              type="time"
              value={newBlock.end}
              onClick={(e) => { try { e.currentTarget.showPicker(); } catch {} }}
              onChange={(e) => setNewBlock({ ...newBlock, end: e.target.value })}
              className="w-full bg-black border border-white/10 rounded-xl p-3 text-white text-xs cursor-pointer hover:border-white/30 transition-all font-mono"
            />
          </div>

          <div className="space-y-1 flex flex-col justify-end">
            <button
              type="button"
              onClick={handleAddBlock}
              className="w-full bg-primary-fixed text-black font-headline font-black uppercase text-xs rounded-xl py-3.5 hover:scale-[0.98] transition-all shadow-md"
            >
              Adicionar Bloqueio
            </button>
          </div>
        </div>

        {/* Lista de bloqueios existentes */}
        {((settings.blockedIntervals && settings.blockedIntervals.length > 0) || (settings.blockedTimes && settings.blockedTimes.length > 0)) && (
          <div className="space-y-2 mt-4">
            <label className="text-[10px] uppercase font-headline text-zinc-500 tracking-wider">Bloqueios Cadastrados</label>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {(settings.blockedIntervals || settings.blockedTimes || []).map((block: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between bg-black/50 border border-white/10 p-3.5 rounded-xl">
                  <div className="flex items-center gap-2">
                    <Ban className="w-3.5 h-3.5 text-red-400" />
                    <span className="text-xs text-zinc-200 font-mono">
                      {block.date} • {block.start} às {block.end}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveBlock(idx)}
                    className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-all"
                    title="Excluir Bloqueio"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>


      {/* =========================================================================
          BOTÃO GERAL: SALVAR TODAS AS CONFIGURAÇÕES
         ========================================================================= */}
      <div className="pt-8 border-t border-white/10">
        <button 
          type="button"
          onClick={handleUpdateSettings}
          className="w-full bg-primary-fixed text-black h-16 rounded-2xl font-headline font-black uppercase tracking-widest shadow-xl shadow-primary-fixed/20 hover:scale-[0.99] transition-all text-sm flex items-center justify-center gap-2"
        >
          <Check className="w-5 h-5" />
          Salvar Todas as Configurações
        </button>
      </div>


      {/* =========================================================================
          MODAL DE CONEXÃO WHATSAPP / QR CODE
         ========================================================================= */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-white/15 rounded-3xl p-6 max-w-sm w-full space-y-4 text-center shadow-2xl relative">
            <h4 className="font-headline font-black text-white text-base uppercase">Conexão WhatsApp</h4>
            
            {isLoadingQr ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3">
                <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
                <p className="text-xs text-zinc-400 font-headline">Verificando status da instância...</p>
              </div>
            ) : isAlreadyConnected ? (
              /* Estado: Já Conectado com Sucesso */
              <div className="space-y-4 py-4">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <h5 className="font-headline font-bold text-white text-sm">WhatsApp Já Conectado!</h5>
                  <p className="text-xs text-zinc-400 mt-1">
                    Esta instância está online e pronta para disparar mensagens autônomas.
                  </p>
                </div>
                
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-left space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-500">Instância:</span>
                    <span className="text-white font-mono font-bold">{settings.automation?.evolutionInstance || 'wats'}</span>
                  </div>
                  {connectedInfo?.profile && (
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-500">Perfil:</span>
                      <span className="text-white font-headline">{connectedInfo.profile}</span>
                    </div>
                  )}
                  {connectedInfo?.number && (
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-500">Número:</span>
                      <span className="text-emerald-400 font-mono font-bold">+{connectedInfo.number}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-500">Status:</span>
                    <span className="text-emerald-400 font-bold uppercase text-[10px]">🟢 Online (Baileys)</span>
                  </div>
                </div>

                <div className="pt-2 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={handleDisconnect}
                    disabled={isDisconnecting}
                    className="w-full py-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl font-headline text-xs uppercase font-bold hover:bg-red-500/20 transition-all flex items-center justify-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    {isDisconnecting ? "Desconectando..." : "Desconectar para Conectar Outro"}
                  </button>
                </div>
              </div>
            ) : qrCodeData ? (
              /* Estado: QR Code para Escanear */
              <div className="space-y-4">
                <p className="text-xs text-zinc-400">
                  Abra o WhatsApp &gt; Aparelhos Conectados &gt; Conectar Aparelho e aponte para o código:
                </p>
                
                <div className="bg-white p-4 rounded-2xl inline-block mx-auto shadow-xl">
                  <img 
                    src={qrCodeData.startsWith('data:') ? qrCodeData : `data:image/png;base64,${qrCodeData}`} 
                    alt="WhatsApp QR Code" 
                    className="w-48 h-48 object-contain" 
                  />
                </div>

                {pairingCode && (
                  <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                    <span className="text-[10px] text-zinc-400 uppercase block">Código de Pareamento:</span>
                    <span className="text-sm font-mono font-bold text-primary-fixed">{pairingCode}</span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleOpenQrModal}
                  className="w-full py-2.5 bg-white/5 border border-white/10 text-zinc-300 rounded-xl font-headline text-xs uppercase font-bold hover:bg-white/10 transition-all flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
                  Atualizar QR Code
                </button>
              </div>
            ) : (
              /* Falha ao carregar */
              <div className="py-6 space-y-3">
                <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
                <p className="text-xs text-zinc-400">
                  Não foi possível obter o QR Code da Evolution API. Verifique a URL e a API Key digitadas.
                </p>
                <button
                  type="button"
                  onClick={handleOpenQrModal}
                  className="px-4 py-2 bg-white/10 text-white rounded-xl text-xs uppercase font-bold hover:bg-white/20"
                >
                  Tentar Novamente
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowQrModal(false)}
              className="w-full py-3 bg-white/10 text-white rounded-xl font-headline text-xs uppercase font-bold hover:bg-white/20 transition-all"
            >
              Fechar Janela
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
