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

function isValidPhone(phone: string): boolean {
  if (!phone) return false;
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 14;
}

export const whatsappService = {
  async sendViaN8n(payload: {
    to: string;
    text: string;
    action?: 'confirmacao' | 'reagendamento' | 'lembrete' | 'followup';
    delay_seconds?: number;
    delayAmount?: number;
    delayUnit?: string;
    instance?: string;
  }) {
    if (!payload.to || !isValidPhone(payload.to)) {
      console.warn("🔒 [WhatsApp Service] Disparo bloqueado: telefone inválido ou ausente.");
      return false;
    }

    const rawPhone = payload.to.replace(/\D/g, '');
    const formattedPhone = rawPhone.startsWith('55') ? rawPhone : `55${rawPhone}`;

    try {
      const response = await fetch(DEFAULT_N8N_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      return response.ok;
    } catch (err: any) {
      console.warn("⚠️ n8n webhook falhou:", err.message);
      return false;
    }
  },

  async sendMessage(to: string, text: string, settings: StudioSettings) {
    const n8nSuccess = await this.sendViaN8n({
      to,
      text,
      action: 'confirmacao',
      instance: settings.automation?.evolutionInstance || 'wats'
    });
    if (n8nSuccess) return true;

    if (!settings.automation?.enabled || !settings.automation.evolutionBaseUrl) {
      console.warn("WhatsApp: Configuração ausente.");
      return false;
    }

    const { evolutionBaseUrl, evolutionApiKey, evolutionInstance } = settings.automation;
    const rawPhone = to.replace(/\D/g, '');
    const formattedPhone = rawPhone.startsWith('55') ? rawPhone : `55${rawPhone}`;

    const baseUrl = evolutionBaseUrl.replace(/\/$/, '');
    const url = `${baseUrl}/message/sendText/${evolutionInstance || 'wats'}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': evolutionApiKey || '020F2F224360-40F7-B022-D17AB8E529E2'
        },
        body: JSON.stringify({
          number: formattedPhone,
          text: text,
          linkPreview: true
        })
      });

      return response.ok;
    } catch (err: any) {
      console.error("❌ Erro WhatsApp direto:", err.message);
      return false;
    }
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
      const success = await this.sendViaN8n({
        to: booking.userPhone,
        text: this.formatMessage(template, booking as Booking),
        action: 'confirmacao',
        instance: settings.automation?.evolutionInstance || 'wats'
      });

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

      const success = await this.sendViaN8n({
        to: booking.userPhone,
        text: this.formatMessage(template, booking as Booking),
        action: 'reagendamento',
        instance: settings.automation?.evolutionInstance || 'wats'
      });

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

  // 3. Lembrete (usando antecedência configurada em settings.automation)
  async sendBookingReminder(booking: Partial<Booking> & { id?: string; userPhone?: string; userName?: string; date?: string; time?: string }, delaySeconds?: number, customSettings?: StudioSettings) {
    try {
      if (!booking.userPhone) return false;
      const settings = await this.getSettings(customSettings);
      if (!settings?.automation?.enabled || !settings.automation.reminderEnabled) return false;

      let calculatedDelaySec = delaySeconds;
      if (typeof calculatedDelaySec === 'undefined') {
        const bookingDate = parseBookingDateTime(booking.date, booking.time);
        const reminderLeadMs = unitToMilliseconds(settings.automation.reminderValue || 2, settings.automation.reminderUnit || 'minutes');
        const triggerTime = bookingDate.getTime() - reminderLeadMs;
        const diffMs = triggerTime - Date.now();
        
        // Se o horário de disparo do lembrete já expirou, NÃO dispara
        if (diffMs < -60000) {
          console.log("🔒 [WhatsApp Service] Lembrete ignorado: horário do lembrete já passou.");
          return false;
        }
        calculatedDelaySec = Math.max(1, Math.round(diffMs / 1000));
      }

      console.log(`🔔 [WhatsApp Service] Disparando Campainha de Lembrete: delay = ${calculatedDelaySec}s`);

      const template = settings.whatsappTemplates?.lembrete || "⏰ Oi {cliente}, passando para lembrar da sua sessão no dia {data} às {horario}!";
      const success = await this.sendViaN8n({
        to: booking.userPhone,
        text: this.formatMessage(template, booking as Booking),
        action: 'lembrete',
        delay_seconds: calculatedDelaySec,
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

      let calculatedDelaySec = delaySeconds;
      if (typeof calculatedDelaySec === 'undefined') {
        const bookingDate = parseBookingDateTime(booking.date, booking.time);
        const followUpDelayMs = unitToMilliseconds(settings.automation.followUpValue || 2, settings.automation.followUpUnit || 'minutes');
        const triggerTime = bookingDate.getTime() + followUpDelayMs;
        const diffMs = triggerTime - Date.now();
        
        // Se o agendamento já passou há mais de 30 dias, NÃO envia
        if (diffMs < -30 * 86400000) {
          console.log("🔒 [WhatsApp Service] Follow-up ignorado: agendamento muito antigo.");
          return false;
        }
        calculatedDelaySec = Math.max(1, Math.round(diffMs / 1000));
      }

      console.log(`💬 [WhatsApp Service] Disparando Campainha de Follow-up: delay = ${calculatedDelaySec}s`);

      const template = settings.whatsappTemplates?.followup || "✨ Olá {cliente}, como está a cicatrização da sua arte? Qualquer dúvida estamos à disposição!";
      const success = await this.sendViaN8n({
        to: booking.userPhone,
        text: this.formatMessage(template, booking as Booking),
        action: 'followup',
        delay_seconds: calculatedDelaySec,
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

    // GUARDRAIL 1: Validar se telefone do cliente é válido
    const targetPhone = booking.userPhone || (booking as any).clientPhone || '';
    if (!isValidPhone(targetPhone)) {
      console.warn("🔒 [WhatsApp Service] Disparo abortado: telefone de destino inválido ou vazio.");
      return { scheduled: false, reason: 'Invalid phone' };
    }

    // GUARDRAIL 2: Validar se data/hora é futura ou presente (NUNCA disparar para agendamentos do passado)
    if (booking.date) {
      const apptDate = parseBookingDateTime(booking.date, booking.time);
      const now = Date.now();
      // Se não é reagendamento e o agendamento já ocorreu há mais de 10 minutos, ABORTA!
      if (!isReschedule && apptDate.getTime() < (now - 10 * 60 * 1000)) {
        console.warn("🔒 [WhatsApp Service] Disparo abortado: agendamento pertence ao passado.");
        return { scheduled: false, reason: 'Past booking rejected' };
      }
    }

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
  }
};
