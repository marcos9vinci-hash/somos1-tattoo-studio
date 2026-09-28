// @ts-nocheck
import React, { useState } from 'react';
import { 
  Clock, ToggleLeft, ToggleRight, Ban, Trash2, Send, Settings, Minus, Plus,
  CheckCircle2, XCircle, AlertCircle, RefreshCw, QrCode, Sparkles, CalendarClock, Cake,
  UserCheck, RotateCcw, Bell, UserX, Eye, Smartphone
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
  const [previewTemplateKey, setPreviewTemplateKey] = useState<string | null>(null);

  const templateConfigs = [
    {
      key: 'confirmacao',
      label: 'Confirmação',
      badge: 'Imediato',
      icon: CheckCircle2,
      color: 'text-emerald-400',
      border: 'border-emerald-500/20',
      bgBadge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      placeholder: 'Olá {cliente}, seu agendamento no Somos 1 Tattoo Studio está confirmado para o dia {data} às {horario} com {profissional} ({servico})! Se precisar reagendar, nos avise.',
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
      placeholder: 'Olá {cliente}, informamos que seu agendamento foi REAGENDADO com sucesso para {data} às {horario} com {profissional} ({servico})!',
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
      placeholder: 'Olá {cliente}, confirmamos o cancelamento do seu agendamento do dia {data} às {horario}. Caso queira escolher outra data futura, estamos à disposição!',
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
      placeholder: 'Oi {cliente}, passando para lembrar da nossa sessão de {servico} marcada para {data} às {horario}! Venha descansado(a) e alimentado(a). Nos vemos em breve!',
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
      placeholder: 'Olá {cliente}, passando para acompanhar a cicatrização da sua arte realizada dia {data}! Lembre-se de seguir as orientações de hidratação. Como está a cicatrização?',
      hint: 'Disparado após a sessão para acompanhar o cliente e garantir satisfação.'
    },
    {
      key: 'aniversario',
      label: 'Aniversário',
      badge: 'No Dia Especial',
      icon: Cake,
      color: 'text-pink-400',
      border: 'border-pink-500/20',
      bgBadge: 'bg-pink-500/10 text-pink-400 border-pink-500/30',
      placeholder: '🎂 Parabéns {cliente}! O Somos 1 Tattoo Studio te deseja um dia incrível! Preparamos um presente especial: use o cupom {cupom} para garantir um desconto exclusivo na sua próxima tattoo.',
      hint: 'Disparado no dia do aniversário do cliente com cupom exclusivo.'
    },
    {
      key: 'reativacao',
      label: 'Reativação (Clientes Sumidos)',
      badge: 'Inatividade',
      icon: UserX,
      color: 'text-orange-400',
      border: 'border-orange-500/20',
      bgBadge: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
      placeholder: 'Fala {primeiro_nome}, tudo bem? Notamos que faz um tempinho que você não passa no estúdio! Que tal tirar aquele novo projeto do papel? Respondendo essa mensagem você ganha um bônus especial na agenda!',
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
      placeholder: 'Oi {primeiro_nome}! Passando para acompanhar seu procedimento e verificar se está na hora daquele retoque ou sessão de acompanhamento. Vamos agendar para deixar sua arte perfeita?',
      hint: 'Disparado X dias após o procedimento para revisão ou retoque.'
    },
    {
      key: 'lista_espera',
      label: 'Lista de Espera',
      badge: 'Vagas Liberadas',
      icon: Bell,
      color: 'text-yellow-400',
      border: 'border-yellow-500/20',
      bgBadge: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
      placeholder: '⚡ Olá {primeiro_nome}! Uma vaga acabou de abrir na agenda para {data} às {horario} com {profissional}. Como você estava na lista de espera, tem prioridade para confirmar agora!',
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
    const current = settings.whatsappTemplates?.[key] || "";
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
    try {
      const res = await whatsappService.fetchInstanceQrCode(settings);
      if (res.base64) {
        setQrCodeData(res.base64);
      }
      if (res.pairingCode) {
        setPairingCode(res.pairingCode);
      }
    } catch (err: any) {
      console.error("Erro ao buscar QR code:", err);
    } finally {
      setIsLoadingQr(false);
    }
  };

  return (
    <div className="space-y-12">
      {/* 1. MODELOS DE MENSAGEM (WHATSAPP) */}
      <div className="space-y-6 pt-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="font-headline text-lg text-white uppercase flex items-center gap-2">
              <Send className="w-5 h-5 text-emerald-400" />
              Modelos de Mensagem (WhatsApp)
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              Personalize o texto exato disparado em cada etapa do ciclo de atendimento e CRM do estúdio.
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

        {/* Templates Responsive Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templateConfigs.map((tpl) => {
            const Icon = tpl.icon;
            const currentVal = settings.whatsappTemplates?.[tpl.key] ?? "";
            const isPreviewing = previewTemplateKey === tpl.key;

            return (
              <div 
                key={tpl.key} 
                className={cn(
                  "bg-black/50 border rounded-2xl p-5 flex flex-col justify-between space-y-4 transition-all duration-200 hover:border-white/20",
                  tpl.border
                )}
              >
                {/* Header */}
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
                  <p className="text-[10px] text-zinc-500 leading-relaxed">
                    {tpl.hint}
                  </p>
                </div>

                {/* Textarea or Preview */}
                <div className="space-y-2">
                  {isPreviewing ? (
                    <div className="bg-[#121b22] border border-[#233138] rounded-xl p-3 min-h-[140px] flex flex-col justify-between relative shadow-inner">
                      <div className="bg-[#005c4b] text-white text-xs p-2.5 rounded-lg rounded-tl-none font-sans leading-relaxed whitespace-pre-wrap">
                        {renderPreviewText(currentVal || tpl.placeholder)}
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
                      placeholder={tpl.placeholder}
                      className="w-full bg-black/70 border border-white/10 rounded-xl p-3 text-white text-xs h-36 focus:outline-none focus:border-primary-fixed leading-relaxed font-sans placeholder:text-zinc-600 resize-none transition-all"
                    />
                  )}
                </div>

                {/* Footer Controls: Tag Injectors & Preview Toggle */}
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

        <p className="text-[10px] text-zinc-500 italic text-center font-headline uppercase tracking-wider">
          Variáveis disponíveis em todos os modelos: {'{cliente}'}, {'{primeiro_nome}'}, {'{data}'}, {'{horario}'}, {'{servico}'}, {'{profissional}'}, {'{cupom}'}, {'{dias_sem_vir}'}
        </p>
      </div>

      {/* 2. AUTOMAÇÃO EVOLUTION API */}
      <div className="space-y-6 pt-8 border-t border-white/10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="font-headline text-lg text-white uppercase flex items-center gap-2">
              <Settings className="w-5 h-5 text-blue-500" />
              Automação Evolution API
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              Defina os intervalos e tempos de disparo automático para cada gatilho de atendimento e retenção.
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
              Conectar QR Code
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
              {settings.automation?.enabled !== false ? "ROBÔ ATIVO" : "ROBÔ DESATIVADO"}
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

        {/* Automation Triggers & Timers Grid */}
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
                  "px-3 py-1 rounded-lg text-[9px] font-black uppercase border transition-all",
                  settings.automation?.confirmationEnabled ? "bg-green-500/10 border-green-500/30 text-green-400" : "bg-zinc-800 border-white/5 text-zinc-500"
                )}
              >
                {settings.automation?.confirmationEnabled ? "ATIVADO" : "DESATIVADO"}
              </button>
            </div>
            <p className="text-[10px] text-zinc-400 italic">
              Envia a confirmação no WhatsApp na hora em que o agendamento é salvo.
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
                    "mt-1 px-2 py-0.5 rounded text-[8px] font-black uppercase border w-fit transition-all",
                    settings.automation?.reminderEnabled ? "bg-green-500/10 border-green-500/30 text-green-400" : "bg-zinc-800 border-white/5 text-zinc-500"
                  )}
                >
                  {settings.automation?.reminderEnabled ? "AUTO-ENVIO ATIVO" : "AUTO-ENVIO INATIVO"}
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
                    "mt-1 px-2 py-0.5 rounded text-[8px] font-black uppercase border w-fit transition-all",
                    settings.automation?.followUpEnabled ? "bg-green-500/10 border-green-500/30 text-green-400" : "bg-zinc-800 border-white/5 text-zinc-500"
                  )}
                >
                  {settings.automation?.followUpEnabled ? "AUTO-ENVIO ATIVO" : "AUTO-ENVIO INATIVO"}
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
                    "mt-1 px-2 py-0.5 rounded text-[8px] font-black uppercase border w-fit transition-all",
                    settings.automation?.reactivationEnabled ? "bg-green-500/10 border-green-500/30 text-green-400" : "bg-zinc-800 border-white/5 text-zinc-500"
                  )}
                >
                  {settings.automation?.reactivationEnabled ? "AUTO-ENVIO ATIVO" : "AUTO-ENVIO INATIVO"}
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
                    "mt-1 px-2 py-0.5 rounded text-[8px] font-black uppercase border w-fit transition-all",
                    settings.automation?.returningEnabled ? "bg-green-500/10 border-green-500/30 text-green-400" : "bg-zinc-800 border-white/5 text-zinc-500"
                  )}
                >
                  {settings.automation?.returningEnabled ? "AUTO-ENVIO ATIVO" : "AUTO-ENVIO INATIVO"}
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
                  "px-3 py-1 rounded-lg text-[9px] font-black uppercase border transition-all",
                  settings.automation?.birthdayEnabled ? "bg-green-500/10 border-green-500/30 text-green-400" : "bg-zinc-800 border-white/5 text-zinc-500"
                )}
              >
                {settings.automation?.birthdayEnabled ? "AUTO-ENVIO ATIVO" : "AUTO-ENVIO INATIVO"}
              </button>
            </div>
            <p className="text-[10px] text-zinc-400 italic">
              Dispara no dia do aniversário do cliente às 09:00 com cupom promocional.
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
                  "px-3 py-1 rounded-lg text-[9px] font-black uppercase border transition-all",
                  settings.automation?.waitingListEnabled ? "bg-green-500/10 border-green-500/30 text-green-400" : "bg-zinc-800 border-white/5 text-zinc-500"
                )}
              >
                {settings.automation?.waitingListEnabled ? "ATIVADO" : "DESATIVADO"}
              </button>
            </div>
            <p className="text-[10px] text-zinc-400 italic">
              Avisa contatos em espera caso ocorra cancelamento ou liberação de horário na agenda.
            </p>
          </div>
        </div>
      </div>

      {/* 3. BLOQUEIOS DE HORÁRIO */}
      <div className="space-y-4 pt-8 border-t border-white/10">
        <h3 className="font-headline text-lg text-white uppercase flex items-center gap-2">
          <Ban className="w-5 h-5 text-red-500" />
          Bloqueios Fixos de Horário
        </h3>
        <p className="text-xs text-zinc-400">
          Horários em que a agenda externa e online fica totalmente indisponível para novos agendamentos.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white/5 p-4 rounded-2xl border border-white/5">
          <input
            type="date"
            value={newBlock.date}
            onChange={(e) => setNewBlock({ ...newBlock, date: e.target.value })}
            className="bg-black border border-white/10 rounded-xl p-3 text-white text-xs"
          />
          <input
            type="time"
            value={newBlock.start}
            onChange={(e) => setNewBlock({ ...newBlock, start: e.target.value })}
            className="bg-black border border-white/10 rounded-xl p-3 text-white text-xs"
          />
          <input
            type="time"
            value={newBlock.end}
            onChange={(e) => setNewBlock({ ...newBlock, end: e.target.value })}
            className="bg-black border border-white/10 rounded-xl p-3 text-white text-xs"
          />
          <button
            type="button"
            onClick={handleAddBlock}
            className="bg-primary-fixed text-black font-headline font-black uppercase text-xs rounded-xl py-3 hover:scale-[0.98] transition-all"
          >
            Adicionar Bloqueio
          </button>
        </div>

        {/* Lista de bloqueios existentes */}
        {settings.blockedTimes && settings.blockedTimes.length > 0 && (
          <div className="space-y-2 mt-4">
            {settings.blockedTimes.map((block: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between bg-black/40 border border-white/5 p-3 rounded-xl">
                <span className="text-xs text-zinc-300 font-mono">
                  {block.date} das {block.start} às {block.end}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemoveBlock(idx)}
                  className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Botão de Salvar Geral */}
      <div className="pt-8 border-t border-white/10">
        <button 
          type="button"
          onClick={handleUpdateSettings}
          className="w-full bg-primary-fixed text-black h-16 rounded-2xl font-headline font-black uppercase tracking-widest shadow-xl shadow-primary-fixed/20 hover:scale-[0.99] transition-all text-sm"
        >
          Salvar Todas as Configurações
        </button>
      </div>

      {/* QR Code Modal */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-white/10 rounded-3xl p-6 max-w-sm w-full space-y-4 text-center">
            <h4 className="font-headline font-black text-white text-base uppercase">Conectar WhatsApp</h4>
            <p className="text-xs text-zinc-400">Abra o WhatsApp &gt; Aparelhos Conectados &gt; Conectar Aparelho</p>
            
            <div className="bg-white p-4 rounded-2xl inline-block mx-auto min-w-[200px] min-h-[200px] flex items-center justify-center">
              {isLoadingQr ? (
                <RefreshCw className="w-8 h-8 text-black animate-spin" />
              ) : qrCodeData ? (
                <img src={qrCodeData.startsWith('data:') ? qrCodeData : `data:image/png;base64,${qrCodeData}`} alt="QR Code" className="w-48 h-48" />
              ) : (
                <p className="text-black text-xs font-headline">Aguardando geração do QR Code...</p>
              )}
            </div>

            {pairingCode && (
              <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                <span className="text-[10px] text-zinc-400 uppercase block">Código de Pareamento:</span>
                <span className="text-sm font-mono font-bold text-primary-fixed">{pairingCode}</span>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowQrModal(false)}
              className="w-full py-3 bg-white/10 text-white rounded-xl font-headline text-xs uppercase font-bold hover:bg-white/20 transition-all"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
