// @ts-nocheck
import { Booking, StudioSettings } from '../types';
import { db } from './firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

const DEFAULT_N8N_WEBHOOK = 'https://www.marcos9vinci.dedyn.io/webhook/indica-automacao';

function unitToMilliseconds(value: number = 2, unit: string = 'minutes'): number {
  switch (unit) {
    case 'minutes':
      return value * 60 * 1000;
    case 'days':
      return value * 24 * 60 * 60 * 1000;
    case 'hours':
    default:
      return value * 60 * 60 * 1000;
  }
}

function parseBookingDateTime(dateStr?: string, timeStr?: string): Date {
  if (!dateStr) return new Date();
  const [year, month, day] = dateStr.split('-').map(Number);
  let hours = 10;
  let minutes = 0;
  if (timeStr) {
    const parts = timeStr.split(':').map(Number);
    hours = parts[0] || 0;
    minutes = parts[1] || 0;
  }
  return new Date(year, month - 1, day, hours, minutes, 0, 0);
}

export const whatsappService = {
  async sendViaN8n(payload: {
    to: string;
    text: string;
    action?: 'confirmacao' | 'reagendamento' | 'lembrete' | 'followup' | 'cancelamento' | 'lista_espera';
    delay_seconds?: number;
    delayAmount?: number;
    delayUnit?: string;
    instance?: string;
  }) {
    const rawPhone = payload.to.replace(/\D/g, '');
    const formattedPhone = rawPhone.startsWith('55') ? rawPhone : `55${rawPhone}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    try {
      const response = await fetch(DEFAULT_N8N_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          action: payload.action || 'confirmacao',
          phone: formattedPhone,
          message: payload.text,
          delay_seconds: payload.delay_seconds || 0,
          delayAmount: payload.delayAmount || 0,
          delayUnit: payload.delayUnit || 'minutes',
          instance: payload.instance || 'wats'
        })
      });
      clearTimeout(timeoutId);
      if (!response.ok) {
        console.warn(`⚠️ [n8n Webhook] Retornou erro HTTP ${response.status}`);
        return false;
      }
      return true;
    } catch (err: any) {
      clearTimeout(timeoutId);
      console.warn("⚠️ [n8n Webhook] Indisponível ou timeout:", err.message);
      return false;
    }
  },

  async sendDirectEvolution(to: string, text: string, settings?: StudioSettings | null) {
    const resolvedSettings = await this.getSettings(settings || undefined);
    if (!resolvedSettings?.automation?.enabled || !resolvedSettings.automation.evolutionBaseUrl) {
      console.warn("WhatsApp: Configuração Evolution ausente ou automação desativada.");
      return false;
    }

    const { evolutionBaseUrl, evolutionApiKey, evolutionInstance } = resolvedSettings.automation;
    const rawPhone = to.replace(/\D/g, '');
    const formattedPhone = rawPhone.startsWith('55') ? rawPhone : `55${rawPhone}`;

    const baseUrl = evolutionBaseUrl.replace(/\/$/, '');
    const url = `${baseUrl}/message/sendText/${evolutionInstance || 'wats'}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': evolutionApiKey || (import.meta as any).env?.VITE_EVOLUTION_API_KEY || ''
        },
        body: JSON.stringify({
          number: formattedPhone,
          text: text,
          linkPreview: true
        })
      });

      if (response.ok) {
        console.log(`✅ [Evolution API] Mensagem enviada diretamente com sucesso para ${formattedPhone}!`);
        return true;
      } else {
        console.error(`❌ [Evolution API] Erro ao enviar (${response.status}):`, await response.text());
        return false;
      }
    } catch (err: any) {
      console.error("❌ Erro WhatsApp direto:", err.message);
      return false;
    }
  },

  async sendMessage(to: string, text: string, settings?: StudioSettings | null, action: any = 'confirmacao') {
    const resolvedSettings = await this.getSettings(settings || undefined);
    const n8nSuccess = await this.sendViaN8n({
      to,
      text,
      action,
      instance: resolvedSettings?.automation?.evolutionInstance || 'wats'
    });
    if (n8nSuccess) return true;

    console.warn(`⚠️ [WhatsApp Service] n8n fora ou falhou. Disparando imediatamente via Evolution API para ${to}...`);
    return await this.sendDirectEvolution(to, text, resolvedSettings);
  },

  formatMessage(template: string, booking: Booking) {
    if (!template) return "";
    return template
      .replace(/{cliente}/g, booking.userName || 'Cliente')
      .replace(/{data}/g, booking.date ? booking.date.split('-').reverse().join('/') : '')
      .replace(/{horario}/g, booking.time || '')
      .replace(/{servico}/g, booking.descricao_servico || 'tatuagem')
      .replace(/{profissional}/g, booking.artistId || 'Markinhos');
  },

  async getSettings(customSettings?: StudioSettings): Promise<StudioSettings | null> {
    if (customSettings) return customSettings;
    try {
      const snap = await getDoc(doc(db, 'studio_settings', 'main'));
      if (snap.exists()) return snap.data() as StudioSettings;
    } catch (e) {
      console.error("Erro ao carregar settings:", e);
    }
    return null;
  },

  // 1. Confirmação
  async sendBookingConfirmation(booking: Partial<Booking> & { id?: string; userPhone?: string; userName?: string; date?: string; time?: string }, customSettings?: StudioSettings) {
    try {
      if (!booking.userPhone) return false;
      const settings = await this.getSettings(customSettings);
      if (!settings?.automation?.enabled) return false;

      const template = settings.whatsappTemplates?.confirmacao || "✅ Olá {cliente}, agendamento confirmado para {data} às {horario}!";
      const text = this.formatMessage(template, booking as Booking);
      const success = await this.sendMessage(booking.userPhone, text, settings, 'confirmacao');

      if (success && booking.id) {
        await updateDoc(doc(db, 'bookings', booking.id), { 
          confirmationSent: true,
          confirmationSentAt: new Date().toISOString()
        });
      }
      return success;
    } catch (err) {
      console.error("Erro confirmação:", err);
      return false;
    }
  },

  // 2. Reagendamento
  async sendBookingReschedule(booking: Partial<Booking> & { id?: string; userPhone?: string; userName?: string; date?: string; time?: string }, customSettings?: StudioSettings) {
    try {
      if (!booking.userPhone) return false;
      const settings = await this.getSettings(customSettings);
      if (!settings?.automation?.enabled) return false;

      const template = settings.whatsappTemplates?.reagendamento || 
        settings.whatsappTemplates?.confirmacao || 
        "🗓️ Olá {cliente}, informamos que seu agendamento foi REAGENDADO com sucesso para {data} às {horario}!";
      const text = this.formatMessage(template, booking as Booking);
      const success = await this.sendMessage(booking.userPhone, text, settings, 'reagendamento');

      if (success && booking.id) {
        await updateDoc(doc(db, 'bookings', booking.id), { 
          rescheduleSent: true,
          rescheduleSentAt: new Date().toISOString()
        });
      }
      return success;
    } catch (err) {
      console.error("Erro reagendamento:", err);
      return false;
    }
  },

  // 3. Lembrete (usando tempo configurado em settings.automation)
  async sendBookingReminder(booking: Partial<Booking> & { id?: string; userPhone?: string; userName?: string; date?: string; time?: string }, delaySeconds?: number, customSettings?: StudioSettings) {
    try {
      if (!booking.userPhone) return false;
      const settings = await this.getSettings(customSettings);
      if (!settings?.automation?.enabled || !settings.automation.reminderEnabled) return false;

      const reminderValue = settings.automation.reminderValue ?? 2;
      const reminderUnit = settings.automation.reminderUnit || 'minutes';

      let calculatedDelaySec = delaySeconds;
      if (typeof calculatedDelaySec === 'undefined') {
        const directDelayMs = unitToMilliseconds(reminderValue, reminderUnit);
        calculatedDelaySec = Math.max(1, Math.round(directDelayMs / 1000));
      }

      console.log(`🔔 [WhatsApp Service] Disparando Campainha de Lembrete: delay = ${calculatedDelaySec}s (${reminderValue} ${reminderUnit})`);

      const template = settings.whatsappTemplates?.lembrete || "⏰ Oi {cliente}, passando para lembrar da sua sessão no dia {data} às {horario}!";
      const success = await this.sendViaN8n({
        to: booking.userPhone,
        text: this.formatMessage(template, booking as Booking),
        action: 'lembrete',
        delay_seconds: calculatedDelaySec,
        delayAmount: reminderValue,
        delayUnit: reminderUnit,
        instance: settings.automation?.evolutionInstance || 'wats'
      });

      return success;
    } catch (err) {
      console.error("Erro lembrete:", err);
      return false;
    }
  },

  // 4. Follow-up (usando tempo configurado em settings.automation)
  async sendBookingFollowUp(booking: Partial<Booking> & { id?: string; userPhone?: string; userName?: string; date?: string; time?: string }, delaySeconds?: number, customSettings?: StudioSettings) {
    try {
      if (!booking.userPhone) return false;
      const settings = await this.getSettings(customSettings);
      if (!settings?.automation?.enabled || !settings.automation.followUpEnabled) return false;

      const followUpValue = settings.automation.followUpValue ?? 5;
      const followUpUnit = settings.automation.followUpUnit || 'minutes';

      let calculatedDelaySec = delaySeconds;
      if (typeof calculatedDelaySec === 'undefined') {
        const directDelayMs = unitToMilliseconds(followUpValue, followUpUnit);
        calculatedDelaySec = Math.max(1, Math.round(directDelayMs / 1000));
      }

      console.log(`💬 [WhatsApp Service] Disparando Campainha de Follow-up: delay = ${calculatedDelaySec}s (${followUpValue} ${followUpUnit})`);

      const template = settings.whatsappTemplates?.followup || "✨ Olá {cliente}, como está a cicatrização da sua arte? Qualquer dúvida estamos à disposição!";
      const success = await this.sendViaN8n({
        to: booking.userPhone,
        text: this.formatMessage(template, booking as Booking),
        action: 'followup',
        delay_seconds: calculatedDelaySec,
        delayAmount: followUpValue,
        delayUnit: followUpUnit,
        instance: settings.automation?.evolutionInstance || 'wats'
      });

      return success;
    } catch (err) {
      console.error("Erro follow-up:", err);
      return false;
    }
  },

  // 5. Ciclo Completo (Disparo Campainha n8n)
  async triggerBookingLifecycle(booking: Booking, isReschedule: boolean = false, customSettings?: StudioSettings) {
    const settings = await this.getSettings(customSettings);
    if (!settings?.automation?.enabled) return { scheduled: false, reason: 'Automation disabled' };

    // Imediato: Confirmação ou Reagendamento
    if (isReschedule) {
      await this.sendBookingReschedule(booking, settings);
    } else if (settings.automation.confirmationEnabled) {
      await this.sendBookingConfirmation(booking, settings);
    }

    // Programado: Lembrete (com o tempo de antecedência configurado no app)
    if (settings.automation.reminderEnabled && booking.date) {
      await this.sendBookingReminder(booking, undefined, settings);
    }

    // Programado: Follow-up (com o tempo pós-sessão configurado no app)
    if (settings.automation.followUpEnabled && booking.date) {
      await this.sendBookingFollowUp(booking, undefined, settings);
    }

    return { scheduled: true };
  },

  // 6. Mensagem de Aniversário (CRM)
  async sendBirthdayMessage(client: { name: string; phone?: string; telefone?: string }, couponCode: string = 'NIVER10', customSettings?: StudioSettings) {
    try {
      const phone = client.phone || client.telefone;
      if (!phone) return false;
      const settings = await this.getSettings(customSettings);
      if (!settings?.automation?.enabled) return false;

      const template = settings.whatsappTemplates?.aniversario || 
        "🎂 Parabéns {cliente}! O Somos 1 Tattoo Studio deseja um feliz aniversário! Use o cupom {cupom} para um desconto especial na sua próxima tattoo.";
      
      const text = template
        .replace(/{cliente}/g, client.name || 'Cliente')
        .replace(/{primeiro_nome}/g, (client.name || 'Cliente').split(' ')[0])
        .replace(/{cupom}/g, couponCode);

      return await this.sendViaN8n({
        to: phone,
        text,
        action: 'aniversario',
        instance: settings.automation?.evolutionInstance || 'wats'
      });
    } catch (err) {
      console.error("Erro mensagem de aniversário:", err);
      return false;
    }
  },

  // 7. Reativação de Clientes Sumidos (CRM)
  async sendReactivationMessage(client: { name: string; phone?: string; telefone?: string; daysInactive?: number }, customSettings?: StudioSettings) {
    try {
      const phone = client.phone || client.telefone;
      if (!phone) return false;
      const settings = await this.getSettings(customSettings);
      if (!settings?.automation?.enabled) return false;

      const template = settings.whatsappTemplates?.reativacao || 
        "🔥 Olá {primeiro_nome}, faz um tempinho que não te vemos no Somos 1 Tattoo Studio! Que tal tirar aquele projeto do papel? Respondendo essa mensagem você ganha prioridade na agenda!";
      
      const text = template
        .replace(/{cliente}/g, client.name || 'Cliente')
        .replace(/{primeiro_nome}/g, (client.name || 'Cliente').split(' ')[0])
        .replace(/{dias_sem_vir}/g, String(client.daysInactive || 45));

      return await this.sendViaN8n({
        to: phone,
        text,
        action: 'reativacao',
        instance: settings.automation?.evolutionInstance || 'wats'
      });
    } catch (err) {
      console.error("Erro mensagem de reativação:", err);
      return false;
    }
  },

  // 8. Previsão de Retorno / Retoque / Manutenção
  async sendReturningMessage(client: { name: string; phone?: string; telefone?: string; serviceName?: string }, customSettings?: StudioSettings) {
    try {
      const phone = client.phone || client.telefone;
      if (!phone) return false;
      const settings = await this.getSettings(customSettings);
      if (!settings?.automation?.enabled) return false;

      const template = settings.whatsappTemplates?.retorno || 
        "🌿 Oi {primeiro_nome}, tudo bem? Passando para checar se sua arte precisa de retoque ou manutenção periódica. Vamos agendar?";
      
      const text = template
        .replace(/{cliente}/g, client.name || 'Cliente')
        .replace(/{primeiro_nome}/g, (client.name || 'Cliente').split(' ')[0])
        .replace(/{servico}/g, client.serviceName || 'tatuagem');

      return await this.sendViaN8n({
        to: phone,
        text,
        action: 'retorno',
        instance: settings.automation?.evolutionInstance || 'wats'
      });
    } catch (err) {
      console.error("Erro mensagem de retorno:", err);
      return false;
    }
  },

  // 9. Notificação de Vaga na Lista de Espera
  async sendWaitingListNotification(client: { name: string; phone?: string; telefone?: string }, slotInfo: { date: string; time: string; artist?: string }, customSettings?: StudioSettings) {
    try {
      const phone = client.phone || client.telefone;
      if (!phone) return false;
      const settings = await this.getSettings(customSettings);
      if (!settings?.automation?.enabled) return false;

      const template = settings.whatsappTemplates?.lista_espera || 
        "⚡ Olá {primeiro_nome}! Uma vaga que você aguardava acabou de abrir para {data} às {horario} com {profissional}. Deseja confirmar?";
      
      const text = template
        .replace(/{cliente}/g, client.name || 'Cliente')
        .replace(/{primeiro_nome}/g, (client.name || 'Cliente').split(' ')[0])
        .replace(/{data}/g, slotInfo.date.split('-').reverse().join('/'))
        .replace(/{horario}/g, slotInfo.time)
        .replace(/{profissional}/g, slotInfo.artist || 'Markinhos');

      return await this.sendViaN8n({
        to: phone,
        text,
        action: 'lista_espera',
        instance: settings.automation?.evolutionInstance || 'wats'
      });
    } catch (err) {
      console.error("Erro mensagem de lista de espera:", err);
      return false;
    }
  },

  // 10. Aviso de Cancelamento
  async sendBookingCancellation(booking: Partial<Booking> & { id?: string; userPhone?: string; userName?: string; date?: string; time?: string }, customSettings?: StudioSettings) {
    try {
      if (!booking.userPhone) return false;
      const settings = await this.getSettings(customSettings);
      if (!settings?.automation?.enabled) return false;

      const template = settings.whatsappTemplates?.cancelamento || 
        "❌ Olá {cliente}, seu agendamento do dia {data} às {horario} foi cancelado. Se desejar remarcar, estamos à disposição!";
      const text = this.formatMessage(template, booking as Booking);

      return await this.sendMessage(booking.userPhone, text, settings, 'cancelamento');
    } catch (err) {
      console.error("Erro mensagem de cancelamento:", err);
      return false;
    }
  },

  // 11. Checagem de Estado da Instância Evolution API
  async checkInstanceConnection(customSettings?: StudioSettings): Promise<{ connected: boolean; state: string; message?: string }> {
    try {
      const settings = await this.getSettings(customSettings);
      if (!settings?.automation?.evolutionBaseUrl || !settings.automation.evolutionInstance) {
        return { connected: false, state: 'not_configured', message: 'Configurações de URL ou Instância não preenchidas.' };
      }

      const baseUrl = settings.automation.evolutionBaseUrl.replace(/\/$/, '');
      const instance = settings.automation.evolutionInstance;
      const apiKey = settings.automation.evolutionApiKey;

      const url = `${baseUrl}/instance/connectionState/${instance}`;
      const res = await fetch(url, {
        headers: {
          'apikey': apiKey || ''
        }
      });

      if (!res.ok) {
        return { connected: false, state: 'error', message: `Erro HTTP ${res.status}` };
      }

      const data = await res.json();
      const state = data?.instance?.state || data?.state || 'unknown';
      return { connected: state === 'open', state };
    } catch (err: any) {
      return { connected: false, state: 'unreachable', message: err.message || 'Servidor inacessível' };
    }
  },

  // 12. Obter QR Code da Evolution API
  async fetchInstanceQrCode(customSettings?: StudioSettings): Promise<{ 
    success: boolean; 
    alreadyConnected?: boolean;
    connectedNumber?: string;
    profileName?: string;
    qrCodeBase64?: string; 
    base64?: string;
    pairingCode?: string; 
    message?: string 
  }> {
    try {
      const settings = await this.getSettings(customSettings);
      if (!settings?.automation?.evolutionBaseUrl || !settings.automation.evolutionInstance) {
        return { success: false, message: 'Configurações de URL ou Instância não preenchidas.' };
      }

      const baseUrl = settings.automation.evolutionBaseUrl.replace(/\/$/, '');
      const instance = settings.automation.evolutionInstance;
      const apiKey = settings.automation.evolutionApiKey;

      // Primeiro verifica se já está conectado na Evolution API
      try {
        const infoRes = await fetch(`${baseUrl}/instance/fetchInstances?instanceName=${instance}`, {
          headers: { 'apikey': apiKey || '' }
        });
        if (infoRes.ok) {
          const instances = await infoRes.json();
          const current = Array.isArray(instances) ? instances.find((i: any) => i.name === instance) : instances;
          if (current?.connectionStatus === 'open' || current?.instance?.state === 'open') {
            return {
              success: true,
              alreadyConnected: true,
              connectedNumber: current?.ownerJid ? current.ownerJid.replace('@s.whatsapp.net', '') : undefined,
              profileName: current?.profileName || undefined,
              message: 'Esta instância já está conectada e operando no WhatsApp!'
            };
          }
        }
      } catch (e) {
        // Prossegue para tentar connect diretamente
      }

      const url = `${baseUrl}/instance/connect/${instance}`;
      const res = await fetch(url, {
        headers: {
          'apikey': apiKey || ''
        }
      });

      if (!res.ok) {
        return { success: false, message: `Erro ao gerar QR code (HTTP ${res.status})` };
      }

      const data = await res.json();

      // Se a resposta direta indicar que o estado é open
      if (data?.instance?.state === 'open' || data?.state === 'open') {
        return {
          success: true,
          alreadyConnected: true,
          message: 'Esta instância já está conectada e ativa no WhatsApp!'
        };
      }

      const base64 = data?.base64 || data?.qrcode?.base64 || null;
      const pairingCode = data?.pairingCode || null;

      return { 
        success: true, 
        alreadyConnected: false,
        qrCodeBase64: base64, 
        base64, 
        pairingCode 
      };
    } catch (err: any) {
      return { success: false, message: err.message || 'Erro ao conectar à API' };
    }
  },

  // 13. Desconectar Instância da Evolution API (Logout)
  async logoutInstance(customSettings?: StudioSettings): Promise<{ success: boolean; message?: string }> {
    try {
      const settings = await this.getSettings(customSettings);
      if (!settings?.automation?.evolutionBaseUrl || !settings.automation.evolutionInstance) {
        return { success: false, message: 'Configurações incompletas.' };
      }

      const baseUrl = settings.automation.evolutionBaseUrl.replace(/\/$/, '');
      const instance = settings.automation.evolutionInstance;
      const apiKey = settings.automation.evolutionApiKey;

      const res = await fetch(`${baseUrl}/instance/logout/${instance}`, {
        method: 'DELETE',
        headers: { 'apikey': apiKey || '' }
      });

      return { success: res.ok, message: res.ok ? 'Instância desconectada com sucesso.' : `Erro HTTP ${res.status}` };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  }
};

