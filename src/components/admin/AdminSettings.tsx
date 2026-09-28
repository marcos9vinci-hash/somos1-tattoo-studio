// @ts-nocheck
import React, { useState } from 'react';
import { 
  Clock, ToggleLeft, ToggleRight, Ban, Trash2, Send, Settings, Minus, Plus,
  CheckCircle2, XCircle, AlertCircle, RefreshCw, QrCode, Sparkles, CalendarClock, Cake
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
  const [templateCategory, setTemplateCategory] = useState<'transacionais' | 'jornada' | 'crm'>('transacionais');
  const [activeTemplateKey, setActiveTemplateKey] = useState<string>('confirmacao');
  const [isCheckingConnection, setIsCheckingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{ connected: boolean; state: string; message?: string } | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [isLoadingQr, setIsLoadingQr] = useState(false);

  const getTemplateDefaultPlaceholder = (key: string): string => {
    switch (key) {
      case 'confirmacao':
        return "✅ Olá {cliente}, seu agendamento no Somos 1 Tattoo Studio está confirmado para o dia {data} às {horario} com {profissional} ({servico}). Se precisar reagendar, nos avise!";
      case 'reagendamento':
        return "🗓️ Olá {cliente}, seu agendamento foi REAGENDADO com sucesso para {data} às {horario} com {profissional} ({servico})!";
      case 'cancelamento':
        return "❌ Olá {cliente}, confirmamos o cancelamento do seu agendamento do dia {data} às {horario}. Caso queira escolher outra data, estamos à disposição!";
      case 'lembrete':
        return "⏰ Oi {cliente}, passando para lembrar da nossa sessão de {servico} marcada para {data} às {horario}! Venha descansado(a) e alimentado(a).";
      case 'followup':
        return "✨ Olá {cliente}, passando para saber como está a cicatrização da sua arte realizada dia {data}! Lembre-se de seguir as orientações de hidratação. Qualquer dúvida é só chamar!";
      case 'aniversario':
        return "🎂 Parabéns {cliente}! O Somos 1 Tattoo Studio te deseja um dia incrível! Preparamos um presente especial: use o cupom {cupom} para garantir um desconto exclusivo na sua próxima tattoo.";
      case 'reativacao':
        return "🔥 Fala {primeiro_nome}, tudo bem? Notamos que faz um tempinho que você não passa no estúdio! Que tal tirar aquele projeto do papel? Respondendo essa mensagem você tem prioridade na agenda!";
      case 'retorno':
        return "🌿 Oi {primeiro_nome}! Passando para acompanhar seu procedimento e verificar se está na hora daquele retoque ou sessão de acompanhamento. Vamos agendar?";
      case 'lista_espera':
        return "⚡ Olá {primeiro_nome}! Uma vaga acabou de abrir na agenda para {data} às {horario} com {profissional}. Como você estava na lista de espera, tem prioridade para confirmar!";
      default:
        return "Olá {cliente}, mensagem do Somos 1 Tattoo Studio.";
    }
  };

  const insertTag = (tag: string) => {
    const current = settings.whatsappTemplates?.[activeTemplateKey] || "";
    setSettings({
      ...settings,
      whatsappTemplates: {
        ...settings.whatsappTemplates,
        [activeTemplateKey]: `${current} ${tag}`
      }
    });
  };

  const renderPreviewText = (template: string) => {
    if (!template) return "";
    return template
      .replace(/{cliente}/g, "Marcos Vinci")
      .replace(/{primeiro_nome}/g, "Marcos")
      .replace(/{data}/g, "28/09/2026")
      .replace(/{horario}/g, "15:00")
      .replace(/{servico}/g, "Tatuagem Realista")
      .replace(/{profissional}/g, "Markinhos")
      .replace(/{cupom}/g, "NIVERVIP")
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
      if (res.success && res.qrCodeBase64) {
        setQrCodeData(res.qrCodeBase64);
        setPairingCode(res.pairingCode || null);
      } else {
        setQrCodeData(null);
      }
    } catch (err) {
      setQrCodeData(null);
    } finally {
      setIsLoadingQr(false);
    }
  };

  if (!settings || !settings.workingHours) {
    return <div className="p-10 text-center text-zinc-500 font-headline uppercase animate-pulse">Carregando configurações...</div>;
  }

  return (
    <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {/* Horários e Dias */}
        <div className="space-y-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-headline text-lg text-white uppercase flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary-fixed" />
              Horários de Trabalho
            </h3>
            <div className="flex gap-2">
              <button 
                onClick={() => setSettings({...settings, allowIndicatorBooking: !settings.allowIndicatorBooking})}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all text-[9px] font-headline uppercase tracking-widest font-black",
                  settings.allowIndicatorBooking 
                    ? "bg-primary-fixed/10 border-primary-fixed/30 text-primary-fixed" 
                    : "bg-zinc-800 border-white/5 text-zinc-500"
                )}
              >
                {settings.allowIndicatorBooking ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                Indicador
              </button>
              <button 
                onClick={() => setSettings({...settings, allowArtistBooking: !settings.allowArtistBooking})}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all text-[9px] font-headline uppercase tracking-widest font-black",
                  settings.allowArtistBooking 
                    ? "bg-primary-fixed/10 border-primary-fixed/30 text-primary-fixed" 
                    : "bg-zinc-800 border-white/5 text-zinc-500"
                )}
              >
                {settings.allowArtistBooking ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                Artista
              </button>
            </div>
          </div>
          
          <div>
            <label className="text-[10px] uppercase font-headline text-zinc-500 block mb-3 tracking-widest">Dias da Semana</label>
            <div className="flex flex-wrap gap-2">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day, idx) => (
                <button
                  key={day}
                  onClick={() => {
                    const newDays = settings.workingDays.includes(idx)
                      ? settings.workingDays.filter(d => d !== idx)
                      : [...settings.workingDays, idx];
                    setSettings({...settings, workingDays: newDays});
                  }}
                  className={cn(
                    "w-10 h-10 rounded-lg font-headline text-[10px] uppercase transition-all flex items-center justify-center border",
                    settings.workingDays.includes(idx) ? "bg-primary-fixed text-black border-primary-fixed" : "bg-black text-zinc-500 border-white/5"
                  )}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] uppercase font-headline text-zinc-500 block mb-2 tracking-widest">Abertura</label>
              <input 
                type="time" 
                value={settings.workingHours?.start || "09:00"}
                onChange={(e) => setSettings({...settings, workingHours: {...(settings.workingHours || {}), start: e.target.value}})}
                className="w-full bg-black border border-white/5 rounded-xl h-12 px-4 text-white font-headline"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase font-headline text-zinc-500 block mb-2 tracking-widest">Fechamento</label>
              <input 
                type="time" 
                value={settings.workingHours?.end || "19:00"}
                onChange={(e) => setSettings({...settings, workingHours: {...(settings.workingHours || {}), end: e.target.value}})}
                className="w-full bg-black border border-white/5 rounded-xl h-12 px-4 text-white font-headline"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-white/5">
            <h3 className="font-headline text-lg text-white mb-4 uppercase flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary-fixed" />
              Duração das Sessões (min)
            </h3>
            <div className="grid grid-cols-3 gap-4">
              {(['Pequena', 'Média', 'Grande'] as const).map(size => (
                <div key={size}>
                  <label className="text-[10px] uppercase font-headline text-zinc-500 block mb-2 tracking-widest">{size}</label>
                  <input 
                    type="number" 
                    value={settings.durations?.[size] || 60}
                    onChange={(e) => setSettings({
                      ...settings, 
                      durations: { ...settings.durations, [size]: parseInt(e.target.value) }
                    })}
                    className="w-full bg-black border border-white/5 rounded-xl h-12 px-4 text-white font-headline"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bloqueios */}
        <div className="space-y-6">
          <h3 className="font-headline text-lg text-white mb-4 uppercase flex items-center gap-2">
            <Ban className="w-5 h-5 text-red-500" />
            Bloquear Horários
          </h3>

          <div className="glass-panel p-4 rounded-xl border border-white/5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-[8px] uppercase text-zinc-500 font-headline mb-1 block">Data</label>
                <input 
                  type="date" 
                  className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-xs text-white"
                  value={newBlock.date}
                  onChange={e => setNewBlock({...newBlock, date: e.target.value})}
                />
              </div>
              <div>
                <label className="text-[8px] uppercase text-zinc-500 font-headline mb-1 block">De</label>
                <input 
                  type="time" 
                  className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-xs text-white"
                  value={newBlock.start}
                  onChange={e => setNewBlock({...newBlock, start: e.target.value})}
                />
              </div>
              <div>
                <label className="text-[8px] uppercase text-zinc-500 font-headline mb-1 block">Até</label>
                <input 
                  type="time" 
                  className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-xs text-white"
                  value={newBlock.end}
                  onChange={e => setNewBlock({...newBlock, end: e.target.value})}
                />
              </div>
            </div>
            <input 
              placeholder="Motivo (Opcional)" 
              className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-xs text-white"
              value={newBlock.label}
              onChange={e => setNewBlock({...newBlock, label: e.target.value})}
            />
            <button 
              onClick={handleAddBlock}
              className="w-full bg-red-500/20 text-red-400 border border-red-500/20 py-2 rounded-lg font-headline text-[10px] uppercase tracking-widest hover:bg-red-500/30 transition-all"
            >
              Adicionar Bloqueio
            </button>
          </div>

          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 scrollbar-hide">
            {settings.blockedIntervals?.map((block: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-white/[0.02] border border-white/5 rounded-lg group">
                <div>
                  <p className="text-[10px] font-headline text-white uppercase">{block.date.split('-').reverse().join('/')}</p>
                  <p className="text-[9px] font-headline text-zinc-500 uppercase tracking-widest">
                    {block.start} - {block.end} {block.label && `• ${block.label}`}
                  </p>
                </div>
                <button 
                  onClick={() => handleRemoveBlock(idx)}
                  className="text-zinc-600 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* WhatsApp Templates & CRM Messaging */}
        <div className="space-y-6 md:col-span-2 pt-8 border-t border-white/5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="font-headline text-lg text-white uppercase flex items-center gap-2">
                <Send className="w-5 h-5 text-green-500" />
                Modelos de Mensagem (WhatsApp)
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                Personalize os textos enviados automaticamente via n8n e Evolution API com tags dinâmicas.
              </p>
            </div>
            
            {/* Template Category Selector */}
            <div className="flex items-center gap-1 bg-black/60 border border-white/10 p-1 rounded-xl">
              {[
                { id: 'transacionais', label: 'Transacionais', icon: CheckCircle2 },
                { id: 'jornada', label: 'Jornada', icon: CalendarClock },
                { id: 'crm', label: 'CRM & Retenção', icon: Sparkles },
              ].map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setTemplateCategory(cat.id as any);
                    if (cat.id === 'transacionais') setActiveTemplateKey('confirmacao');
                    if (cat.id === 'jornada') setActiveTemplateKey('lembrete');
                    if (cat.id === 'crm') setActiveTemplateKey('aniversario');
                  }}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-headline uppercase font-bold transition-all",
                    templateCategory === cat.id 
                      ? "bg-primary-fixed text-black shadow-md shadow-primary-fixed/20" 
                      : "text-zinc-400 hover:text-white hover:bg-white/5"
                  )}
                >
                  <cat.icon className="w-3.5 h-3.5" />
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sub-Tabs for Templates */}
          <div className="flex flex-wrap gap-2 pt-2 border-b border-white/5 pb-3">
            {templateCategory === 'transacionais' && (
              <>
                <button
                  type="button"
                  onClick={() => setActiveTemplateKey('confirmacao')}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 border",
                    activeTemplateKey === 'confirmacao'
                      ? "bg-green-500/15 border-green-500/40 text-green-400 font-bold"
                      : "bg-zinc-900 border-white/5 text-zinc-400 hover:text-white"
                  )}
                >
                  ✅ Confirmação
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTemplateKey('reagendamento')}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 border",
                    activeTemplateKey === 'reagendamento'
                      ? "bg-blue-500/15 border-blue-500/40 text-blue-400 font-bold"
                      : "bg-zinc-900 border-white/5 text-zinc-400 hover:text-white"
                  )}
                >
                  🗓️ Reagendamento
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTemplateKey('cancelamento')}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 border",
                    activeTemplateKey === 'cancelamento'
                      ? "bg-red-500/15 border-red-500/40 text-red-400 font-bold"
                      : "bg-zinc-900 border-white/5 text-zinc-400 hover:text-white"
                  )}
                >
                  ❌ Cancelamento
                </button>
              </>
            )}

            {templateCategory === 'jornada' && (
              <>
                <button
                  type="button"
                  onClick={() => setActiveTemplateKey('lembrete')}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 border",
                    activeTemplateKey === 'lembrete'
                      ? "bg-yellow-500/15 border-yellow-500/40 text-yellow-400 font-bold"
                      : "bg-zinc-900 border-white/5 text-zinc-400 hover:text-white"
                  )}
                >
                  ⏰ Lembrete de Sessão
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTemplateKey('followup')}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 border",
                    activeTemplateKey === 'followup'
                      ? "bg-purple-500/15 border-purple-500/40 text-purple-400 font-bold"
                      : "bg-zinc-900 border-white/5 text-zinc-400 hover:text-white"
                  )}
                >
                  💬 Follow-up (Cicatrização)
                </button>
              </>
            )}

            {templateCategory === 'crm' && (
              <>
                <button
                  type="button"
                  onClick={() => setActiveTemplateKey('aniversario')}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 border",
                    activeTemplateKey === 'aniversario'
                      ? "bg-pink-500/15 border-pink-500/40 text-pink-400 font-bold"
                      : "bg-zinc-900 border-white/5 text-zinc-400 hover:text-white"
                  )}
                >
                  🎂 Aniversariantes
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTemplateKey('reativacao')}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 border",
                    activeTemplateKey === 'reativacao'
                      ? "bg-amber-500/15 border-amber-500/40 text-amber-400 font-bold"
                      : "bg-zinc-900 border-white/5 text-zinc-400 hover:text-white"
                  )}
                >
                  🔥 Clientes Sumidos
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTemplateKey('retorno')}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 border",
                    activeTemplateKey === 'retorno'
                      ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-400 font-bold"
                      : "bg-zinc-900 border-white/5 text-zinc-400 hover:text-white"
                  )}
                >
                  🌿 Retorno & Retoque
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTemplateKey('lista_espera')}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 border",
                    activeTemplateKey === 'lista_espera'
                      ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400 font-bold"
                      : "bg-zinc-900 border-white/5 text-zinc-400 hover:text-white"
                  )}
                >
                  ⚡ Lista de Espera (Vaga)
                </button>
              </>
            )}
          </div>

          {/* Template Editor + Live WhatsApp Preview Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left: Textarea Editor + Variable Inserters */}
            <div className="lg:col-span-7 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider font-headline">
                  Texto do Modelo: {activeTemplateKey.toUpperCase()}
                </span>
                <span className="text-[10px] text-zinc-500">
                  Clique nas tags abaixo para inserir
                </span>
              </div>

              {/* Tag Insertion Pills */}
              <div className="flex flex-wrap gap-1.5 p-2.5 bg-zinc-900/80 rounded-xl border border-white/5">
                {[
                  { tag: '{cliente}', label: 'Nome Completo' },
                  { tag: '{primeiro_nome}', label: 'Primeiro Nome' },
                  { tag: '{data}', label: 'Data' },
                  { tag: '{horario}', label: 'Horário' },
                  { tag: '{servico}', label: 'Serviço' },
                  { tag: '{profissional}', label: 'Profissional' },
                  { tag: '{cupom}', label: 'Cupom' },
                  { tag: '{dias_sem_vir}', label: 'Dias Inativo' }
                ].map(item => (
                  <button
                    key={item.tag}
                    type="button"
                    onClick={() => insertTag(item.tag)}
                    className="px-2 py-1 rounded-lg bg-white/5 hover:bg-primary-fixed/20 hover:text-primary-fixed text-zinc-300 text-[11px] font-mono border border-white/10 hover:border-primary-fixed/30 transition-all active:scale-95"
                    title={`Inserir ${item.label}`}
                  >
                    + {item.tag}
                  </button>
                ))}
              </div>

              <textarea
                value={settings.whatsappTemplates?.[activeTemplateKey] || ""}
                onChange={(e) => setSettings({
                  ...settings,
                  whatsappTemplates: { ...settings.whatsappTemplates, [activeTemplateKey]: e.target.value }
                })}
                placeholder={getTemplateDefaultPlaceholder(activeTemplateKey)}
                rows={7}
                className="w-full bg-black border border-white/10 rounded-2xl p-4 text-white text-sm focus:outline-none focus:border-primary-fixed focus:ring-1 focus:ring-primary-fixed transition-all font-sans leading-relaxed"
              />
            </div>

            {/* Right: WhatsApp Phone Simulation Live Preview */}
            <div className="lg:col-span-5 bg-zinc-950 border border-white/10 rounded-2xl p-4 space-y-3 shadow-2xl relative overflow-hidden">
              <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center text-xs font-bold border border-green-500/30">
                    WA
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white font-headline">Prévia no WhatsApp</p>
                    <p className="text-[10px] text-green-400 font-medium flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /> Online
                    </p>
                  </div>
                </div>
                <span className="text-[10px] text-zinc-500 uppercase font-mono">Simulação</span>
              </div>

              {/* Chat Wallpaper Container */}
              <div className="bg-[#0b141a] rounded-xl p-3.5 min-h-[160px] flex flex-col justify-end border border-white/5 relative">
                {/* Bubble Message */}
                <div className="bg-[#005c4b] text-white rounded-2xl rounded-tl-sm p-3 max-w-[95%] shadow-md self-start space-y-1.5">
                  <p className="text-xs whitespace-pre-wrap leading-relaxed">
                    {renderPreviewText(settings.whatsappTemplates?.[activeTemplateKey] || getTemplateDefaultPlaceholder(activeTemplateKey))}
                  </p>
                  <div className="flex items-center justify-end gap-1 text-[9px] text-zinc-400 font-mono">
                    <span>10:30</span>
                    <span className="text-[#53bdeb] font-bold">✓✓</span>
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-zinc-500 text-center italic">
                As variáveis são substituídas automaticamente com os dados reais do cliente no momento do disparo.
              </p>
            </div>
          </div>
        </div>

        {/* Automation Config — Evolution API & CRM Engine */}
        <div className="space-y-6 md:col-span-2 pt-8 border-t border-white/5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="font-headline text-lg text-white uppercase flex items-center gap-2">
                <Settings className="w-5 h-5 text-blue-500" />
                Automação Evolution API & Disparos
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                Conectividade direta com o WhatsApp para envio autônomo de lembretes, confirmações e reativações.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Check Connection Button */}
              <button
                type="button"
                onClick={handleCheckConnection}
                disabled={isCheckingConnection}
                className="px-3.5 py-2 rounded-xl border border-white/10 bg-zinc-900 text-zinc-300 font-headline text-[10px] uppercase font-bold hover:bg-white/5 hover:text-white transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                <RefreshCw className={cn("w-3.5 h-3.5 text-blue-400", isCheckingConnection && "animate-spin")} />
                {isCheckingConnection ? "Checando..." : "Status Conexão"}
              </button>

              {/* QR Code Modal Button */}
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
                className="px-3.5 py-2 rounded-xl border border-blue-500/30 bg-blue-500/10 text-blue-400 font-headline text-[10px] uppercase font-bold hover:bg-blue-500/20 transition-all"
              >
                Testar Envio
              </button>

              {/* Master Automation Toggle */}
              <button
                type="button"
                onClick={() => setSettings({
                  ...settings,
                  automation: { ...settings.automation, enabled: !settings.automation?.enabled }
                })}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl font-headline text-[10px] uppercase font-black transition-all border shadow-lg",
                  settings.automation?.enabled ? "bg-green-500/10 border-green-500/30 text-green-400" : "bg-zinc-800 border-white/5 text-zinc-500"
                )}
              >
                {settings.automation?.enabled ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                {settings.automation?.enabled ? "Automação Ativa" : "Automação Inativa"}
              </button>
            </div>
          </div>

          {/* Connection Status Banner */}
          {connectionStatus && (
            <div className={cn(
              "p-3.5 rounded-xl border flex items-center justify-between text-xs font-medium animate-in fade-in",
              connectionStatus.connected 
                ? "bg-green-500/10 border-green-500/30 text-green-300"
                : "bg-red-500/10 border-red-500/30 text-red-300"
            )}>
              <div className="flex items-center gap-2">
                {connectionStatus.connected ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <XCircle className="w-4 h-4 text-red-400" />}
                <span>
                  <strong>Instância {settings.automation?.evolutionInstance || 'WhatsApp'}:</strong>{' '}
                  {connectionStatus.connected ? "Conectado e pronto para disparos!" : (connectionStatus.message || `Estado atual: ${connectionStatus.state}`)}
                </span>
              </div>
              {!connectionStatus.connected && (
                <button
                  type="button"
                  onClick={handleOpenQrModal}
                  className="text-xs text-white underline font-bold hover:text-green-400 transition-colors"
                >
                  Escanear QR Code agora →
                </button>
              )}
            </div>
          )}

          {/* Credentials Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-headline text-zinc-500 block mb-2">Base URL</label>
              <input
                type="text"
                value={settings.automation?.evolutionBaseUrl || ""}
                onChange={(e) => setSettings({
                  ...settings,
                  automation: { ...settings.automation, evolutionBaseUrl: e.target.value }
                })}
                placeholder="https://sua-api.code.run"
                className="w-full bg-black border border-white/5 rounded-xl h-12 px-4 text-white text-sm focus:border-primary-fixed focus:outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-headline text-zinc-500 block mb-2">API Key</label>
              <input
                type="password"
                value={settings.automation?.evolutionApiKey || ""}
                onChange={(e) => setSettings({
                  ...settings,
                  automation: { ...settings.automation, evolutionApiKey: e.target.value }
                })}
                placeholder="Sua API Key"
                className="w-full bg-black border border-white/5 rounded-xl h-12 px-4 text-white text-sm focus:border-primary-fixed focus:outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-headline text-zinc-500 block mb-2">Instância</label>
              <input
                type="text"
                value={settings.automation?.evolutionInstance || ""}
                onChange={(e) => setSettings({
                  ...settings,
                  automation: { ...settings.automation, evolutionInstance: e.target.value }
                })}
                placeholder="Ex: indicai-whats"
                className="w-full bg-black border border-white/5 rounded-xl h-12 px-4 text-white text-sm focus:border-primary-fixed focus:outline-none"
              />
            </div>
          </div>

          {/* Grid de Regras de Automação & CRM */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
            {/* 1. Confirmação */}
            <div className="space-y-3 bg-white/5 p-4 rounded-2xl border border-white/5">
              <div className="flex justify-between items-center">
                <label className="text-[10px] uppercase font-headline text-zinc-400 font-bold">Confirmação Instantânea</label>
                <button
                  type="button"
                  onClick={() => setSettings({
                    ...settings,
                    automation: { ...settings.automation, confirmationEnabled: !settings.automation?.confirmationEnabled }
                  })}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-[8px] font-black uppercase border transition-all",
                    settings.automation?.confirmationEnabled ? "bg-green-500/10 border-green-500/30 text-green-400" : "bg-zinc-800 border-white/5 text-zinc-500"
                  )}
                >
                  {settings.automation?.confirmationEnabled ? "ATIVADO" : "DESATIVADO"}
                </button>
              </div>
              <p className="text-[9px] text-zinc-500 leading-relaxed">Dispara imediatamente no WhatsApp no momento em que você agenda.</p>
            </div>

            {/* 2. Lembrete com timer */}
            <div className="space-y-3 bg-white/5 p-4 rounded-2xl border border-white/5">
              <div className="flex justify-between items-center">
                <div className="flex flex-col">
                  <label className="text-[10px] uppercase font-headline text-zinc-400 font-bold">Lembrete de Sessão</label>
                  <button
                    type="button"
                    onClick={() => setSettings({
                      ...settings,
                      automation: { ...settings.automation, reminderEnabled: !settings.automation?.reminderEnabled }
                    })}
                    className={cn(
                      "mt-1 px-2 py-0.5 rounded text-[7px] font-black uppercase border w-fit transition-all",
                      settings.automation?.reminderEnabled ? "bg-green-500/10 border-green-500/30 text-green-400" : "bg-zinc-800 border-white/5 text-zinc-500"
                    )}
                  >
                    {settings.automation?.reminderEnabled ? "ATIVO" : "INATIVO"}
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center bg-black border border-white/10 rounded-xl overflow-hidden h-9">
                    <button
                      type="button"
                      onClick={() => setSettings({
                        ...settings,
                        automation: { ...settings.automation, reminderValue: Math.max(1, (settings.automation?.reminderValue || 1) - 1) }
                      })}
                      className="px-2.5 hover:bg-white/5 text-zinc-400"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-8 text-center text-primary-fixed font-black text-xs">
                      {settings.automation?.reminderValue || 24}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSettings({
                        ...settings,
                        automation: { ...settings.automation, reminderValue: (settings.automation?.reminderValue || 1) + 1 }
                      })}
                      className="px-2.5 hover:bg-white/5 text-zinc-400"
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
                    className="bg-black text-[10px] text-zinc-400 p-2 rounded-xl border border-white/10 font-headline uppercase"
                  >
                    <option value="minutes">Min</option>
                    <option value="hours">Horas</option>
                    <option value="days">Dias</option>
                  </select>
                </div>
              </div>
              <p className="text-[9px] text-zinc-500">Antecedência programada antes do horário marcado.</p>
            </div>

            {/* 3. Follow-up com timer */}
            <div className="space-y-3 bg-white/5 p-4 rounded-2xl border border-white/5">
              <div className="flex justify-between items-center">
                <div className="flex flex-col">
                  <label className="text-[10px] uppercase font-headline text-zinc-400 font-bold">Follow-up Cicatrização</label>
                  <button
                    type="button"
                    onClick={() => setSettings({
                      ...settings,
                      automation: { ...settings.automation, followUpEnabled: !settings.automation?.followUpEnabled }
                    })}
                    className={cn(
                      "mt-1 px-2 py-0.5 rounded text-[7px] font-black uppercase border w-fit transition-all",
                      settings.automation?.followUpEnabled ? "bg-green-500/10 border-green-500/30 text-green-400" : "bg-zinc-800 border-white/5 text-zinc-500"
                    )}
                  >
                    {settings.automation?.followUpEnabled ? "ATIVO" : "INATIVO"}
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center bg-black border border-white/10 rounded-xl overflow-hidden h-9">
                    <button
                      type="button"
                      onClick={() => setSettings({
                        ...settings,
                        automation: { ...settings.automation, followUpValue: Math.max(1, (settings.automation?.followUpValue || 1) - 1) }
                      })}
                      className="px-2.5 hover:bg-white/5 text-zinc-400"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-8 text-center text-primary-fixed font-black text-xs">
                      {settings.automation?.followUpValue || 3}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSettings({
                        ...settings,
                        automation: { ...settings.automation, followUpValue: (settings.automation?.followUpValue || 1) + 1 }
                      })}
                      className="px-2.5 hover:bg-white/5 text-zinc-400"
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
                    className="bg-black text-[10px] text-zinc-400 p-2 rounded-xl border border-white/10 font-headline uppercase"
                  >
                    <option value="minutes">Min</option>
                    <option value="hours">Horas</option>
                    <option value="days">Dias</option>
                  </select>
                </div>
              </div>
              <p className="text-[9px] text-zinc-500">Tempo após a sessão para acompanhar o cliente.</p>
            </div>

            {/* 4. Aniversariantes */}
            <div className="space-y-3 bg-white/5 p-4 rounded-2xl border border-white/5">
              <div className="flex justify-between items-center">
                <label className="text-[10px] uppercase font-headline text-zinc-400 font-bold">Parabéns Aniversário</label>
                <button
                  type="button"
                  onClick={() => setSettings({
                    ...settings,
                    automation: { ...settings.automation, birthdayEnabled: !settings.automation?.birthdayEnabled }
                  })}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-[8px] font-black uppercase border transition-all",
                    settings.automation?.birthdayEnabled ? "bg-green-500/10 border-green-500/30 text-green-400" : "bg-zinc-800 border-white/5 text-zinc-500"
                  )}
                >
                  {settings.automation?.birthdayEnabled ? "ATIVADO" : "DESATIVADO"}
                </button>
              </div>
              <p className="text-[9px] text-zinc-500 leading-relaxed">Envia felicitações e cupom às 09h da manhã para os aniversariantes do dia.</p>
            </div>

            {/* 5. Clientes Sumidos (Reativação) */}
            <div className="space-y-3 bg-white/5 p-4 rounded-2xl border border-white/5">
              <div className="flex justify-between items-center">
                <div className="flex flex-col">
                  <label className="text-[10px] uppercase font-headline text-zinc-400 font-bold">Reativação Sumidos</label>
                  <button
                    type="button"
                    onClick={() => setSettings({
                      ...settings,
                      automation: { ...settings.automation, reactivationEnabled: !settings.automation?.reactivationEnabled }
                    })}
                    className={cn(
                      "mt-1 px-2 py-0.5 rounded text-[7px] font-black uppercase border w-fit transition-all",
                      settings.automation?.reactivationEnabled ? "bg-green-500/10 border-green-500/30 text-green-400" : "bg-zinc-800 border-white/5 text-zinc-500"
                    )}
                  >
                    {settings.automation?.reactivationEnabled ? "ATIVO" : "INATIVO"}
                  </button>
                </div>
                <div className="flex items-center gap-1 bg-black border border-white/10 rounded-xl px-2.5 py-1">
                  <span className="text-[10px] text-zinc-500 uppercase font-headline">Após:</span>
                  <input
                    type="number"
                    value={settings.automation?.reactivationDays || 45}
                    onChange={(e) => setSettings({
                      ...settings,
                      automation: { ...settings.automation, reactivationDays: parseInt(e.target.value) || 45 }
                    })}
                    className="w-12 bg-transparent text-primary-fixed font-black text-xs text-center focus:outline-none"
                  />
                  <span className="text-[10px] text-zinc-500">dias</span>
                </div>
              </div>
              <p className="text-[9px] text-zinc-500">Filtra quem não agenda há mais de X dias para disparo de retorno.</p>
            </div>

            {/* 6. Retorno & Retoque Periódico */}
            <div className="space-y-3 bg-white/5 p-4 rounded-2xl border border-white/5">
              <div className="flex justify-between items-center">
                <div className="flex flex-col">
                  <label className="text-[10px] uppercase font-headline text-zinc-400 font-bold">Retorno & Retoque</label>
                  <button
                    type="button"
                    onClick={() => setSettings({
                      ...settings,
                      automation: { ...settings.automation, returningEnabled: !settings.automation?.returningEnabled }
                    })}
                    className={cn(
                      "mt-1 px-2 py-0.5 rounded text-[7px] font-black uppercase border w-fit transition-all",
                      settings.automation?.returningEnabled ? "bg-green-500/10 border-green-500/30 text-green-400" : "bg-zinc-800 border-white/5 text-zinc-500"
                    )}
                  >
                    {settings.automation?.returningEnabled ? "ATIVO" : "INATIVO"}
                  </button>
                </div>
                <div className="flex items-center gap-1 bg-black border border-white/10 rounded-xl px-2.5 py-1">
                  <span className="text-[10px] text-zinc-500 uppercase font-headline">Ciclo:</span>
                  <input
                    type="number"
                    value={settings.automation?.returningDays || 30}
                    onChange={(e) => setSettings({
                      ...settings,
                      automation: { ...settings.automation, returningDays: parseInt(e.target.value) || 30 }
                    })}
                    className="w-12 bg-transparent text-primary-fixed font-black text-xs text-center focus:outline-none"
                  />
                  <span className="text-[10px] text-zinc-500">dias</span>
                </div>
              </div>
              <p className="text-[9px] text-zinc-500">Lembrete para retoque ou nova sessão após o período do ciclo.</p>
            </div>
          </div>
        </div>
      </div>

      {/* QR Code Modal */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-zinc-950 border border-white/15 rounded-3xl p-6 w-full max-w-sm shadow-2xl relative text-center space-y-4">
            <button
              type="button"
              onClick={() => setShowQrModal(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white bg-zinc-900 rounded-full p-1.5 transition-colors"
            >
              ✕
            </button>

            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <QrCode className="w-6 h-6" />
            </div>

            <div>
              <h4 className="font-headline text-lg text-white uppercase font-bold">Conectar WhatsApp</h4>
              <p className="text-xs text-zinc-400 mt-1">
                Abra o WhatsApp no celular &gt; Aparelhos conectados &gt; Conectar aparelho e escaneie o código.
              </p>
            </div>

            <div className="bg-white p-4 rounded-2xl w-fit mx-auto shadow-xl">
              {isLoadingQr ? (
                <div className="w-48 h-48 flex flex-col items-center justify-center gap-2 text-zinc-800 text-xs font-bold">
                  <RefreshCw className="w-6 h-6 animate-spin text-emerald-600" />
                  Gerando QR Code...
                </div>
              ) : qrCodeData ? (
                <img
                  src={qrCodeData.startsWith('data:') ? qrCodeData : `data:image/png;base64,${qrCodeData}`}
                  alt="WhatsApp QR Code"
                  className="w-48 h-48 object-contain"
                />
              ) : (
                <div className="w-48 h-48 flex flex-col items-center justify-center text-zinc-600 text-xs p-2">
                  <AlertCircle className="w-6 h-6 text-amber-500 mb-1" />
                  Não foi possível carregar o QR Code. Verifique as credenciais da Evolution API.
                </div>
              )}
            </div>

            {pairingCode && (
              <div className="p-3 bg-zinc-900 rounded-xl border border-white/10 text-xs text-zinc-300">
                <span className="text-zinc-500 block text-[10px] uppercase font-mono">Ou código de pareamento:</span>
                <strong className="text-primary-fixed tracking-widest text-sm">{pairingCode}</strong>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={handleOpenQrModal}
                disabled={isLoadingQr}
                className="flex-1 py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-xs font-semibold text-zinc-300 hover:text-white flex items-center justify-center gap-1.5"
              >
                <RefreshCw className={cn("w-3.5 h-3.5", isLoadingQr && "animate-spin")} />
                Atualizar Código
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowQrModal(false);
                  handleCheckConnection();
                }}
                className="flex-1 py-2.5 rounded-xl bg-primary-fixed text-black text-xs font-bold font-headline uppercase tracking-wider hover:brightness-110"
              >
                Já Escaneei
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="pt-8 border-t border-white/5">
        <button 
          onClick={handleUpdateSettings}
          className="w-full bg-primary-fixed text-black h-16 rounded-2xl font-headline font-black uppercase tracking-widest shadow-xl shadow-primary-fixed/20 hover:scale-[0.99] transition-all"
        >
          Salvar Todas as Configurações
        </button>
      </div>
    </div>
  );
};
