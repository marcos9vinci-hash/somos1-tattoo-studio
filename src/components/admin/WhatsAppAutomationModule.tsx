import React, { useState, useEffect } from 'react';
import { StudioSettings } from '../../types';
import { whatsappService } from '../../lib/whatsappService';
import { 
  Bot, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  Smartphone, 
  Key, 
  Server, 
  Send, 
  Sliders, 
  Clock, 
  Calendar, 
  Power, 
  Gift, 
  UserCheck, 
  ListFilter, 
  History, 
  QrCode,
  LogOut,
  AlertTriangle,
  Zap
} from 'lucide-react';
import { toast } from '../../lib/toast';

interface Props {
  settings: StudioSettings;
  setSettings: React.Dispatch<React.SetStateAction<StudioSettings>>;
  handleUpdateSettings: (e: React.FormEvent) => Promise<void>;
  onTestWhatsApp: (targetPhone: string, testMsg: string) => Promise<boolean>;
}

export const WhatsAppAutomationModule: React.FC<Props> = ({
  settings,
  setSettings,
  handleUpdateSettings,
  onTestWhatsApp
}) => {
  const [checkingConnection, setCheckingConnection] = useState(false);
  const [connectionInfo, setConnectionInfo] = useState<{
    connected: boolean;
    connectedNumber?: string;
    profileName?: string;
    qrCodeBase64?: string | null;
    message?: string;
  } | null>(null);

  const [disconnecting, setDisconnecting] = useState(false);
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState('Olá! Este é um teste da automação WhatsApp do Somos 1 Tattoo Studio 🚀');
  const [sendingTest, setSendingTest] = useState(false);

  // Verifica estado inicial de conexão ao carregar
  useEffect(() => {
    handleCheckConnection(true);
  }, []);

  const handleCheckConnection = async (isInitial = false) => {
    setCheckingConnection(true);
    try {
      const res = await whatsappService.fetchInstanceQrCode(settings);
      if (res.success) {
        if (res.alreadyConnected) {
          setConnectionInfo({
            connected: true,
            connectedNumber: res.connectedNumber || '5511948116922',
            profileName: res.profileName || 'somos1tattoo',
            qrCodeBase64: null,
            message: res.message || 'WhatsApp conectado e pronto para envios!'
          });
          if (!isInitial) toast.success('WhatsApp Conectado e Ativo!');
        } else if (res.qrCodeBase64 || res.base64) {
          setConnectionInfo({
            connected: false,
            qrCodeBase64: res.qrCodeBase64 || res.base64,
            message: 'Escaneie o QR Code abaixo com seu WhatsApp.'
          });
          if (!isInitial) toast.info('QR Code gerado! Aponte sua câmera.');
        } else {
          setConnectionInfo({
            connected: false,
            qrCodeBase64: null,
            message: res.message || 'Instância desconectada.'
          });
        }
      } else {
        setConnectionInfo({
          connected: false,
          qrCodeBase64: null,
          message: res.message || 'Não foi possível contatar a Evolution API.'
        });
        if (!isInitial) toast.error(res.message || 'Falha ao verificar conexão');
      }
    } catch (err: any) {
      setConnectionInfo({
        connected: false,
        qrCodeBase64: null,
        message: err.message || 'Erro inesperado'
      });
    } finally {
      setCheckingConnection(false);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Tem certeza que deseja desconectar o WhatsApp? Você precisará escanear o QR Code novamente para reativar.')) {
      return;
    }
    setDisconnecting(true);
    try {
      const res = await whatsappService.logoutInstance(settings);
      if (res.success) {
        toast.success('WhatsApp desconectado.');
        setConnectionInfo({
          connected: false,
          qrCodeBase64: null,
          message: 'Instância desconectada. Clique em "Gerar QR Code" para conectar novo aparelho.'
        });
      } else {
        toast.error(res.message || 'Erro ao desconectar');
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao desconectar');
    } finally {
      setDisconnecting(false);
    }
  };

  const updateAutomation = (key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      automation: {
        ...(prev.automation || {
          evolutionBaseUrl: 'https://p01--evolution--6n2dx6dsdlsf.code.run',
          evolutionApiKey: '020F2F224360-40F7-B022-D17AB8E529E2',
          evolutionInstance: 'wats',
          reminderValue: 24,
          reminderUnit: 'hours',
          followUpValue: 7,
          followUpUnit: 'days',
          enabled: false,
          confirmationEnabled: true,
          reminderEnabled: true,
          followUpEnabled: true,
          birthdayEnabled: true,
          birthdayTime: '09:00',
          reactivationEnabled: true,
          reactivationValue: 60,
          reactivationUnit: 'days',
          returningEnabled: true,
          returningValue: 30,
          returningUnit: 'days',
          waitingListEnabled: true
        }),
        [key]: value
      }
    }));
  };

  const handleTestSend = async () => {
    if (!testPhone.trim()) {
      toast.error('Informe um número de telefone com DDD.');
      return;
    }
    setSendingTest(true);
    try {
      const success = await onTestWhatsApp(testPhone, testMessage);
      if (success) {
        toast.success('Mensagem enviada com sucesso!');
        setTestModalOpen(false);
      } else {
        toast.error('Falha no envio da mensagem de teste.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao testar envio');
    } finally {
      setSendingTest(false);
    }
  };

  const auto = settings.automation || {
    evolutionBaseUrl: 'https://p01--evolution--6n2dx6dsdlsf.code.run',
    evolutionApiKey: '020F2F224360-40F7-B022-D17AB8E529E2',
    evolutionInstance: 'wats',
    reminderValue: 24,
    reminderUnit: 'hours',
    followUpValue: 7,
    followUpUnit: 'days',
    enabled: false,
    confirmationEnabled: true,
    reminderEnabled: true,
    followUpEnabled: true,
    birthdayEnabled: true,
    birthdayTime: '09:00',
    reactivationEnabled: true,
    reactivationValue: 60,
    reactivationUnit: 'days',
    returningEnabled: true,
    returningValue: 30,
    returningUnit: 'days',
    waitingListEnabled: true
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-headline font-bold uppercase tracking-wider mb-2">
              <Bot className="w-3.5 h-3.5" />
              Evolution API v2 · WhatsApp 24/7
            </div>
            <h2 className="text-xl md:text-2xl font-headline font-black text-foreground">
              Automação & Gatilhos do WhatsApp
            </h2>
            <p className="text-xs md:text-sm text-muted-foreground mt-1">
              Gerencie a conexão da instância, robô de disparos automáticos e tempos de cada gatilho.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setTestModalOpen(true)}
              className="px-4 py-2.5 rounded-xl border border-border bg-card hover:bg-muted text-xs font-headline font-bold text-foreground transition-all flex items-center gap-2 shadow-xs"
            >
              <Send className="w-4 h-4 text-emerald-500" />
              Testar Envio
            </button>
            <button
              type="button"
              onClick={handleUpdateSettings}
              className="px-5 py-2.5 rounded-xl bg-foreground text-background hover:opacity-90 text-xs font-headline font-black uppercase tracking-wider transition-all flex items-center gap-2 shadow-sm"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Salvar Automações
            </button>
          </div>
        </div>
      </div>

      {/* Status da Conexão WhatsApp */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              connectionInfo?.connected 
                ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                : 'bg-muted text-muted-foreground'
            }`}>
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-headline font-bold text-foreground flex items-center gap-2">
                Status da Instância WhatsApp
                {connectionInfo?.connected ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    CONECTADO & ATIVO
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                    DESCONECTADO
                  </span>
                )}
              </h3>
              <p className="text-xs text-muted-foreground">
                Instância conectada via Evolution API: <span className="font-mono font-bold text-foreground">{auto.evolutionInstance || 'wats'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleCheckConnection(false)}
              disabled={checkingConnection}
              className="px-3 py-2 rounded-xl border border-border bg-card hover:bg-muted text-xs font-headline font-bold text-foreground transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${checkingConnection ? 'animate-spin text-emerald-500' : ''}`} />
              {checkingConnection ? 'Verificando...' : 'Checar Conexão'}
            </button>

            {connectionInfo?.connected && (
              <button
                type="button"
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="px-3 py-2 rounded-xl border border-rose-500/30 bg-rose-500/5 hover:bg-rose-500/10 text-xs font-headline font-bold text-rose-500 transition-all flex items-center gap-2"
              >
                <LogOut className="w-3.5 h-3.5" />
                {disconnecting ? 'Desconectando...' : 'Desconectar'}
              </button>
            )}
          </div>
        </div>

        {/* Detalhe da Conexão Ativa ou QR Code */}
        {connectionInfo?.connected ? (
          <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 font-black text-lg">
                WA
              </div>
              <div>
                <p className="text-sm font-headline font-bold text-foreground">
                  {connectionInfo.profileName || 'Somos 1 Tattoo'}
                </p>
                <p className="text-xs font-mono text-muted-foreground">
                  +{connectionInfo.connectedNumber || '5511948116922'}
                </p>
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5">
                  ✅ Pronto para enviar confirmações, lembretes e follow-ups em tempo real.
                </p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground bg-card border border-border px-2.5 py-1 rounded-md">
                Protocolo: Baileys Webhook
              </span>
            </div>
          </div>
        ) : connectionInfo?.qrCodeBase64 ? (
          <div className="border border-border rounded-xl p-6 bg-muted/20 flex flex-col items-center text-center">
            <div className="bg-white p-3 rounded-2xl shadow-md border border-border mb-3">
              <img 
                src={connectionInfo.qrCodeBase64.startsWith('data:') ? connectionInfo.qrCodeBase64 : `data:image/png;base64,${connectionInfo.qrCodeBase64}`} 
                alt="QR Code WhatsApp" 
                className="w-56 h-56 object-contain"
              />
            </div>
            <p className="text-sm font-headline font-bold text-foreground mb-1">
              Conectar WhatsApp via QR Code
            </p>
            <p className="text-xs text-muted-foreground max-w-md">
              Abra o WhatsApp no celular &gt; Menu (três pontos) ou Ajustes &gt; <strong>Aparelhos Conectados</strong> &gt; <strong>Conectar um Aparelho</strong> e aponte para a imagem acima.
            </p>
          </div>
        ) : (
          <div className="border border-dashed border-border rounded-xl p-4 bg-muted/10 text-center">
            <p className="text-xs text-muted-foreground">
              {connectionInfo?.message || 'Clique em "Checar Conexão" para validar o status ou gerar o QR Code de pareamento.'}
            </p>
          </div>
        )}
      </div>

      {/* MASTER TOGGLE: Robô Geral */}
      <div className={`border rounded-2xl p-6 transition-all ${
        auto.enabled 
          ? 'bg-emerald-500/5 border-emerald-500/30 shadow-sm' 
          : 'bg-card border-border'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${
              auto.enabled ? 'bg-emerald-500 text-white shadow-md' : 'bg-muted text-muted-foreground'
            }`}>
              <Power className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-headline font-black text-foreground">
                ROBÔ DE MENSAGENS GERAL
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {auto.enabled 
                  ? 'O sistema está ativo e enviará mensagens conforme os gatilhos abaixo.' 
                  : 'O sistema está pausado. Nenhuma mensagem automática será disparada.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => updateAutomation('enabled', !auto.enabled)}
            className={`px-6 py-3 rounded-xl text-xs font-headline font-black uppercase tracking-wider transition-all flex items-center gap-2 shrink-0 ${
              auto.enabled 
                ? 'bg-emerald-500 text-white shadow-md hover:bg-emerald-600' 
                : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            <Power className="w-4 h-4" />
            {auto.enabled ? 'Robô LIGADO' : 'Robô DESLIGADO'}
          </button>
        </div>
      </div>

      {/* GATILHOS E TEMPOS (7 Gatilhos com On/Off e Controles de Tempo) */}
      <div className="space-y-4">
        <div>
          <h3 className="text-base font-headline font-black text-foreground">
            Gatilhos de Disparo Automático
          </h3>
          <p className="text-xs text-muted-foreground">
            Ligue ou desligue cada tipo de notificação individualmente e ajuste o tempo de antecedência ou intervalo.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 1. Confirmação Imediata */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-xs flex flex-col justify-between">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-headline font-bold text-foreground">
                    1. Confirmação Imediata
                  </h4>
                  <p className="text-[11px] text-muted-foreground">
                    Disparo instantâneo ao criar agendamento
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => updateAutomation('confirmationEnabled', !(auto.confirmationEnabled ?? true))}
                className={`px-3 py-1 rounded-full text-[10px] font-headline font-black uppercase tracking-wider transition-all ${
                  (auto.confirmationEnabled ?? true)
                    ? 'bg-emerald-500 text-white'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {(auto.confirmationEnabled ?? true) ? 'ATIVADO' : 'DESLIGADO'}
              </button>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Envia os detalhes da sessão, data, horário e artista imediatamente após o agendamento ser concluído.
            </p>
            <div className="pt-3 border-t border-border/50 text-[11px] text-muted-foreground flex items-center justify-between">
              <span>Tempo de envio:</span>
              <span className="font-bold text-foreground">Imediato (0 min)</span>
            </div>
          </div>

          {/* 2. Lembrete Pré-Sessão */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-xs flex flex-col justify-between">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-500 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-headline font-bold text-foreground">
                    2. Lembrete de Sessão
                  </h4>
                  <p className="text-[11px] text-muted-foreground">
                    Lembrete com recomendações pré-tattoo
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => updateAutomation('reminderEnabled', !(auto.reminderEnabled ?? true))}
                className={`px-3 py-1 rounded-full text-[10px] font-headline font-black uppercase tracking-wider transition-all ${
                  (auto.reminderEnabled ?? true)
                    ? 'bg-sky-500 text-white'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {(auto.reminderEnabled ?? true) ? 'ATIVADO' : 'DESLIGADO'}
              </button>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Dispara com antecedência lembrando o cliente sobre dormir bem, hidratação e não consumir álcool.
            </p>
            <div className="pt-3 border-t border-border/50 flex items-center justify-between gap-2">
              <span className="text-[11px] text-muted-foreground shrink-0">Enviar com antecedência de:</span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => updateAutomation('reminderValue', Math.max(1, (auto.reminderValue || 24) - 1))}
                  className="w-7 h-7 rounded-lg border border-border bg-muted/40 hover:bg-muted flex items-center justify-center text-xs font-bold"
                >
                  -
                </button>
                <input
                  type="number"
                  min="1"
                  max="168"
                  value={auto.reminderValue ?? 24}
                  onChange={(e) => updateAutomation('reminderValue', Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-12 h-7 text-center rounded-lg border border-border bg-card text-xs font-bold"
                />
                <button
                  type="button"
                  onClick={() => updateAutomation('reminderValue', (auto.reminderValue || 24) + 1)}
                  className="w-7 h-7 rounded-lg border border-border bg-muted/40 hover:bg-muted flex items-center justify-center text-xs font-bold"
                >
                  +
                </button>
                <select
                  value={auto.reminderUnit || 'hours'}
                  onChange={(e) => updateAutomation('reminderUnit', e.target.value)}
                  className="h-7 text-xs font-bold rounded-lg border border-border bg-card px-2"
                >
                  <option value="hours">Horas</option>
                  <option value="days">Dias</option>
                </select>
              </div>
            </div>
          </div>

          {/* 3. Follow-up Pós-Tatuagem */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-xs flex flex-col justify-between">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-headline font-bold text-foreground">
                    3. Follow-up Cicatrização
                  </h4>
                  <p className="text-[11px] text-muted-foreground">
                    Acompanhamento pós-sessão
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => updateAutomation('followUpEnabled', !(auto.followUpEnabled ?? true))}
                className={`px-3 py-1 rounded-full text-[10px] font-headline font-black uppercase tracking-wider transition-all ${
                  (auto.followUpEnabled ?? true)
                    ? 'bg-indigo-500 text-white'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {(auto.followUpEnabled ?? true) ? 'ATIVADO' : 'DESLIGADO'}
              </button>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Dispara dias após a sessão para saber como está a cicatrização e reforçar o cuidado com pomada.
            </p>
            <div className="pt-3 border-t border-border/50 flex items-center justify-between gap-2">
              <span className="text-[11px] text-muted-foreground shrink-0">Enviar após a sessão:</span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => updateAutomation('followUpValue', Math.max(1, (auto.followUpValue || 7) - 1))}
                  className="w-7 h-7 rounded-lg border border-border bg-muted/40 hover:bg-muted flex items-center justify-center text-xs font-bold"
                >
                  -
                </button>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={auto.followUpValue ?? 7}
                  onChange={(e) => updateAutomation('followUpValue', Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-12 h-7 text-center rounded-lg border border-border bg-card text-xs font-bold"
                />
                <button
                  type="button"
                  onClick={() => updateAutomation('followUpValue', (auto.followUpValue || 7) + 1)}
                  className="w-7 h-7 rounded-lg border border-border bg-muted/40 hover:bg-muted flex items-center justify-center text-xs font-bold"
                >
                  +
                </button>
                <select
                  value={auto.followUpUnit || 'days'}
                  onChange={(e) => updateAutomation('followUpUnit', e.target.value)}
                  className="h-7 text-xs font-bold rounded-lg border border-border bg-card px-2"
                >
                  <option value="days">Dias</option>
                  <option value="hours">Horas</option>
                </select>
              </div>
            </div>
          </div>

          {/* 4. Retoque & Avaliação Final */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-xs flex flex-col justify-between">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-violet-500/10 text-violet-500 flex items-center justify-center">
                  <History className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-headline font-bold text-foreground">
                    4. Retoque & Avaliação
                  </h4>
                  <p className="text-[11px] text-muted-foreground">
                    Lembrete da janela de retoque
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => updateAutomation('returningEnabled', !(auto.returningEnabled ?? true))}
                className={`px-3 py-1 rounded-full text-[10px] font-headline font-black uppercase tracking-wider transition-all ${
                  (auto.returningEnabled ?? true)
                    ? 'bg-violet-500 text-white'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {(auto.returningEnabled ?? true) ? 'ATIVADO' : 'DESLIGADO'}
              </button>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Lembra o cliente sobre a janela de 30 dias para avaliar retoque gratuito ou nova sessão.
            </p>
            <div className="pt-3 border-t border-border/50 flex items-center justify-between gap-2">
              <span className="text-[11px] text-muted-foreground shrink-0">Enviar após:</span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => updateAutomation('returningValue', Math.max(1, (auto.returningValue || 30) - 5))}
                  className="w-7 h-7 rounded-lg border border-border bg-muted/40 hover:bg-muted flex items-center justify-center text-xs font-bold"
                >
                  -
                </button>
                <input
                  type="number"
                  min="5"
                  max="90"
                  value={auto.returningValue ?? 30}
                  onChange={(e) => updateAutomation('returningValue', Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-12 h-7 text-center rounded-lg border border-border bg-card text-xs font-bold"
                />
                <button
                  type="button"
                  onClick={() => updateAutomation('returningValue', (auto.returningValue || 30) + 5)}
                  className="w-7 h-7 rounded-lg border border-border bg-muted/40 hover:bg-muted flex items-center justify-center text-xs font-bold"
                >
                  +
                </button>
                <span className="text-xs font-bold text-foreground">dias</span>
              </div>
            </div>
          </div>

          {/* 5. Reativação de Clientes Ausentes */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-xs flex flex-col justify-between">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-headline font-bold text-foreground">
                    5. Reativação de Clientes
                  </h4>
                  <p className="text-[11px] text-muted-foreground">
                    Resgatar clientes sem nova sessão
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => updateAutomation('reactivationEnabled', !(auto.reactivationEnabled ?? true))}
                className={`px-3 py-1 rounded-full text-[10px] font-headline font-black uppercase tracking-wider transition-all ${
                  (auto.reactivationEnabled ?? true)
                    ? 'bg-amber-500 text-white'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {(auto.reactivationEnabled ?? true) ? 'ATIVADO' : 'DESLIGADO'}
              </button>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Dispara automaticamente para clientes que não tatuam há X dias, oferecendo um cupom VIP.
            </p>
            <div className="pt-3 border-t border-border/50 flex items-center justify-between gap-2">
              <span className="text-[11px] text-muted-foreground shrink-0">Inativo por mais de:</span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => updateAutomation('reactivationValue', Math.max(15, (auto.reactivationValue || 60) - 15))}
                  className="w-7 h-7 rounded-lg border border-border bg-muted/40 hover:bg-muted flex items-center justify-center text-xs font-bold"
                >
                  -
                </button>
                <input
                  type="number"
                  min="15"
                  max="365"
                  value={auto.reactivationValue ?? 60}
                  onChange={(e) => updateAutomation('reactivationValue', Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-14 h-7 text-center rounded-lg border border-border bg-card text-xs font-bold"
                />
                <button
                  type="button"
                  onClick={() => updateAutomation('reactivationValue', (auto.reactivationValue || 60) + 15)}
                  className="w-7 h-7 rounded-lg border border-border bg-muted/40 hover:bg-muted flex items-center justify-center text-xs font-bold"
                >
                  +
                </button>
                <span className="text-xs font-bold text-foreground">dias</span>
              </div>
            </div>
          </div>

          {/* 6. Feliz Aniversário */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-xs flex flex-col justify-between">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-pink-500/10 text-pink-500 flex items-center justify-center">
                  <Gift className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-headline font-bold text-foreground">
                    6. Mensagem de Aniversário
                  </h4>
                  <p className="text-[11px] text-muted-foreground">
                    Parabéns e cupom comemorativo
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => updateAutomation('birthdayEnabled', !(auto.birthdayEnabled ?? true))}
                className={`px-3 py-1 rounded-full text-[10px] font-headline font-black uppercase tracking-wider transition-all ${
                  (auto.birthdayEnabled ?? true)
                    ? 'bg-pink-500 text-white'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {(auto.birthdayEnabled ?? true) ? 'ATIVADO' : 'DESLIGADO'}
              </button>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Envia felicitações personalizadas com cupom de desconto no dia do aniversário do cliente.
            </p>
            <div className="pt-3 border-t border-border/50 flex items-center justify-between gap-2">
              <span className="text-[11px] text-muted-foreground shrink-0">Horário de disparo:</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="time"
                  value={auto.birthdayTime || '09:00'}
                  onClick={(e) => (e.target as any).showPicker?.()}
                  onChange={(e) => updateAutomation('birthdayTime', e.target.value)}
                  className="h-7 text-xs font-bold rounded-lg border border-border bg-card px-2 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* 7. Lista de Espera / Encaixe */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-xs flex flex-col justify-between md:col-span-2">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                  <ListFilter className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-headline font-bold text-foreground">
                    7. Alerta de Vagas na Lista de Espera
                  </h4>
                  <p className="text-[11px] text-muted-foreground">
                    Notificação rápida ao surgir desistência ou horário vago
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => updateAutomation('waitingListEnabled', !(auto.waitingListEnabled ?? true))}
                className={`px-3 py-1 rounded-full text-[10px] font-headline font-black uppercase tracking-wider transition-all ${
                  (auto.waitingListEnabled ?? true)
                    ? 'bg-emerald-500 text-white'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {(auto.waitingListEnabled ?? true) ? 'ATIVADO' : 'DESLIGADO'}
              </button>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Quando um agendamento é cancelado ou um horário é liberado, dispara alerta prioritário para os clientes inscritos na lista de espera.
            </p>
            <div className="pt-3 border-t border-border/50 text-[11px] text-muted-foreground flex items-center justify-between">
              <span>Critério de envio:</span>
              <span className="font-bold text-foreground">Ordem de inscrição na lista</span>
            </div>
          </div>
        </div>
      </div>

      {/* Credenciais & Configuração Técnica da Evolution API */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Server className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-headline font-bold text-foreground">
            Configurações da Instância Evolution API
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-headline font-bold text-foreground block mb-1">
              URL Base da API
            </label>
            <input
              type="text"
              value={auto.evolutionBaseUrl || ''}
              onChange={(e) => updateAutomation('evolutionBaseUrl', e.target.value)}
              placeholder="https://sua-evolution.com"
              className="w-full text-xs font-mono p-2.5 rounded-xl border border-border bg-card text-foreground"
            />
          </div>

          <div>
            <label className="text-xs font-headline font-bold text-foreground block mb-1">
              Nome da Instância
            </label>
            <input
              type="text"
              value={auto.evolutionInstance || ''}
              onChange={(e) => updateAutomation('evolutionInstance', e.target.value)}
              placeholder="wats"
              className="w-full text-xs font-mono p-2.5 rounded-xl border border-border bg-card text-foreground"
            />
          </div>

          <div>
            <label className="text-xs font-headline font-bold text-foreground block mb-1">
              API Key (Token Global)
            </label>
            <input
              type="password"
              value={auto.evolutionApiKey || ''}
              onChange={(e) => updateAutomation('evolutionApiKey', e.target.value)}
              placeholder="API Key secreta"
              className="w-full text-xs font-mono p-2.5 rounded-xl border border-border bg-card text-foreground"
            />
          </div>
        </div>
      </div>

      {/* Modal de Teste de Envio */}
      {testModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-headline font-bold text-foreground flex items-center gap-2">
                <Send className="w-4 h-4 text-emerald-500" />
                Testar Envio WhatsApp
              </h3>
              <button
                type="button"
                onClick={() => setTestModalOpen(false)}
                className="text-muted-foreground hover:text-foreground text-xs p-1"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="text-xs font-headline font-bold text-foreground block mb-1">
                Número do WhatsApp (com DDD)
              </label>
              <input
                type="tel"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                placeholder="11999999999"
                className="w-full text-sm p-3 rounded-xl border border-border bg-card text-foreground font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-headline font-bold text-foreground block mb-1">
                Mensagem de Teste
              </label>
              <textarea
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                rows={4}
                className="w-full text-xs p-3 rounded-xl border border-border bg-card text-foreground resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setTestModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-headline font-bold border border-border hover:bg-muted text-muted-foreground"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleTestSend}
                disabled={sendingTest}
                className="px-5 py-2 rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 text-xs font-headline font-black uppercase tracking-wider flex items-center gap-2 disabled:opacity-50"
              >
                {sendingTest ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                {sendingTest ? 'Enviando...' : 'Enviar Agora'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
