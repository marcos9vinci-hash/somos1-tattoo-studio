import { initializeApp, getApps } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  collection, 
  getDocs, 
  addDoc, 
  query, 
  where, 
  updateDoc, 
  serverTimestamp 
} from 'firebase/firestore';

const firebaseConfig = {
  projectId: "memorizeai-7b8fd",
  appId: "1:287874618983:web:30718f0f4f5ad68cb4e6c2",
  apiKey: "AIzaSyAhIXcG4ReuncxNBZSqjXYOu7Exka_TNo0",
  authDomain: "memorizeai-7b8fd.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-dcd3cc7e-f58b-453b-a948-88e194766ac9",
  storageBucket: "memorizeai-7b8fd.firebasestorage.app",
  messagingSenderId: "287874618983"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

/**
 * Converte "HH:MM" para minutos desde meia-noite
 */
function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/**
 * Converte minutos para "HH:MM"
 */
function minutesToTime(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export const agentService = {
  /**
   * Consulta horários disponíveis em uma data
   */
  async getAvailableSlots(dateStr, size = 'Pequena') {
    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return { available: false, error: 'Data inválida. Use o formato AAAA-MM-DD.' };
    }

    // 1. Carrega configurações do estúdio
    const settingsSnap = await getDoc(doc(db, 'studio_settings', 'main'));
    const settings = settingsSnap.exists() ? settingsSnap.data() : {};

    const workingDays = settings.workingDays || [1, 2, 3, 4, 5, 6];
    const workingHours = settings.workingHours || { start: '09:00', end: '19:00' };
    const durations = settings.durations || { Pequena: 60, Média: 120, Grande: 240 };
    const blockedDates = settings.blockedDates || [];
    const blockedIntervals = settings.blockedIntervals || [];

    // Checa dia da semana (0 = Domingo)
    const [year, month, day] = dateStr.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);
    const dayOfWeek = dateObj.getDay();

    const weekNames = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

    if (!workingDays.includes(dayOfWeek)) {
      return {
        available: false,
        date: dateStr,
        reason: `O estúdio não realiza atendimentos aos ${weekNames[dayOfWeek]}s.`,
        freeSlots: []
      };
    }

    // Checa bloqueio de dia inteiro
    if (blockedDates.includes(dateStr)) {
      return {
        available: false,
        date: dateStr,
        reason: `O estúdio estará fechado neste dia (data com bloqueio integral na agenda).`,
        freeSlots: []
      };
    }

    // 2. Busca agendamentos existentes no dia
    const q = query(
      collection(db, 'bookings'),
      where('date', '==', dateStr)
    );
    const bookingsSnap = await getDocs(q);
    const busyIntervals = [];

    bookingsSnap.forEach(d => {
      const b = d.data();
      // Ignora cancelados ou rejeitados
      if (b.status === 'cancelled' || b.status === 'rejected' || b.status === 'no_show') return;

      const startMin = timeToMinutes(b.time);
      const durationMin = durations[b.size] || (b.size === 'Grande' ? 240 : b.size === 'Média' ? 120 : 60);
      busyIntervals.push({ start: startMin, end: startMin + durationMin });
    });

    // Adiciona intervalos bloqueados manualmente pelo estúdio
    blockedIntervals
      .filter(bi => bi.date === dateStr)
      .forEach(bi => {
        busyIntervals.push({
          start: timeToMinutes(bi.start),
          end: timeToMinutes(bi.end)
        });
      });

    // 3. Calcula slots livres
    const durationNeeded = durations[size] || 60;
    const workStart = timeToMinutes(workingHours.start || '09:00');
    const workEnd = timeToMinutes(workingHours.end || '19:00');

    const freeSlots = [];
    const step = 60; // Slots a cada 1h

    for (let current = workStart; current + durationNeeded <= workEnd; current += step) {
      const slotEnd = current + durationNeeded;
      const overlaps = busyIntervals.some(busy => {
        return (current < busy.end && slotEnd > busy.start);
      });

      if (!overlaps) {
        freeSlots.push(minutesToTime(current));
      }
    }

    return {
      available: freeSlots.length > 0,
      date: dateStr,
      dayOfWeek: weekNames[dayOfWeek],
      freeSlots: freeSlots,
      workingHours: `${workingHours.start} às ${workingHours.end}`,
      durationNeededMinutes: durationNeeded
    };
  },

  /**
   * Cria um novo agendamento no Firestore
   */
  async createBooking(data) {
    const {
      clientName,
      clientPhone,
      date,
      time,
      size = 'Pequena',
      artistId = 'Markinhos',
      description = 'Tatuagem',
      status,
      createdByAdmin = false
    } = data;

    if (!clientName || !date || !time) {
      throw new Error('Nome do cliente, data e horário são obrigatórios.');
    }

    const cleanPhone = (clientPhone || '').replace(/\D/g, '');
    const finalPhone = cleanPhone.length > 0 && !cleanPhone.startsWith('55') ? `55${cleanPhone}` : cleanPhone;

    const bookingStatus = status || (createdByAdmin ? 'approved' : 'pending_approval');

    const newBookingData = {
      userName: clientName,
      userPhone: finalPhone,
      date: date,
      time: time,
      size: size,
      artistId: artistId,
      descricao_servico: description,
      status: bookingStatus,
      priceEstimated: size === 'Pequena' ? 250 : size === 'Média' ? 600 : 1200,
      depositPaid: createdByAdmin ? 0 : 0,
      confirmationSent: false,
      reminderSent: false,
      followUpSent: false,
      origin: createdByAdmin ? 'whatsapp_admin_agent' : 'whatsapp_client_agent',
      createdAt: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, 'bookings'), newBookingData);

    return {
      success: true,
      bookingId: docRef.id,
      booking: {
        id: docRef.id,
        ...newBookingData
      },
      message: `Agendamento de ${clientName} confirmado para ${date} às ${time} com ${artistId}!`
    };
  },

  /**
   * Retorna resumo de agendamentos para o Admin
   */
  async getDailySummary(dateStr) {
    if (!dateStr) {
      const now = new Date();
      dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    }

    const q = query(
      collection(db, 'bookings'),
      where('date', '==', dateStr)
    );
    const snap = await getDocs(q);

    const list = [];
    snap.forEach(d => {
      const b = d.data();
      list.push({
        id: d.id,
        name: b.userName || 'Sem nome',
        phone: b.userPhone || '',
        time: b.time || '00:00',
        size: b.size || 'Média',
        status: b.status,
        service: b.descricao_servico || 'Tatuagem'
      });
    });

    list.sort((a, b) => a.time.localeCompare(b.time));

    let text = `📅 *Agenda Somos 1 Tattoo (${dateStr.split('-').reverse().join('/')})*\n\n`;
    if (list.length === 0) {
      text += `Nenhum agendamento marcado para esta data. Todos os horários estão vagos! 🚀`;
    } else {
      text += `Total de sessões: *${list.length}*\n\n`;
      list.forEach((item, idx) => {
        const statusEmoji = item.status === 'approved' ? '✅' : item.status === 'rescheduled' ? '🔄' : item.status === 'completed' ? '🏆' : '⏳';
        text += `${idx + 1}. *${item.time}* - ${item.name} (${item.size})\n   ${statusEmoji} Status: ${item.status}\n`;
      });
    }

    return {
      date: dateStr,
      count: list.length,
      bookings: list,
      summaryText: text
    };
  },

  /**
   * Bloqueia dia ou horário na agenda
   */
  async blockSlot({ date, start, end, label, fullDay = false }) {
    if (!date) throw new Error('Data é obrigatória para bloqueio.');

    const settingsRef = doc(db, 'studio_settings', 'main');
    const snap = await getDoc(settingsRef);
    const current = snap.exists() ? snap.data() : {};

    if (fullDay) {
      const blockedDates = Array.from(new Set([...(current.blockedDates || []), date]));
      await updateDoc(settingsRef, { blockedDates });
      return { success: true, message: `Dia ${date} bloqueado integralmente na agenda.` };
    } else {
      const newInterval = {
        date,
        start: start || '12:00',
        end: end || '13:00',
        label: label || 'Bloqueio via WhatsApp'
      };
      const blockedIntervals = [...(current.blockedIntervals || []), newInterval];
      await updateDoc(settingsRef, { blockedIntervals });
      return { success: true, message: `Intervalo ${date} das ${start} às ${end} bloqueado com sucesso.` };
    }
  },

  /**
   * Processador Central de Mensagens Inbound (Meta Business Agent Style)
   */
  async processIncomingMessage({ senderPhone, senderName, text }) {
    const rawText = (text || '').trim();
    const lower = rawText.toLowerCase();

    // 1. Identifica se é administrador
    const adminPhones = ['5511948116922', '5511957837132'];
    const isAdmin = adminPhones.includes(senderPhone);

    // Helpers de Parsing de Data/Hora/Tamanho
    function parseDate(t) {
      const now = new Date();
      const matchBr = t.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
      if (matchBr) {
        const d = String(matchBr[1]).padStart(2, '0');
        const m = String(matchBr[2]).padStart(2, '0');
        const y = matchBr[3] ? (matchBr[3].length === 2 ? '20' + matchBr[3] : matchBr[3]) : String(now.getFullYear());
        return `${y}-${m}-${d}`;
      }
      if (t.includes('hoje')) {
        return now.toISOString().split('T')[0];
      }
      if (t.includes('amanha') || t.includes('amanhã')) {
        const tm = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        return tm.toISOString().split('T')[0];
      }
      const days = { 'domingo': 0, 'segunda': 1, 'terça': 2, 'terca': 2, 'quarta': 3, 'quinta': 4, 'sexta': 5, 'sábado': 6, 'sabado': 6 };
      for (const [dayName, dayIdx] of Object.entries(days)) {
        if (t.includes(dayName)) {
          const currentDay = now.getDay();
          let diff = dayIdx - currentDay;
          if (diff <= 0) diff += 7;
          const target = new Date(now.getTime() + diff * 24 * 60 * 60 * 1000);
          return target.toISOString().split('T')[0];
        }
      }
      return null;
    }

    function parseTime(t) {
      const m = t.match(/(\b[0-2]?\d)(?:[:hH](\d{2})|\s*h\b|\s*horas\b)/i);
      if (m) {
        const hour = String(parseInt(m[1])).padStart(2, '0');
        const min = m[2] ? String(m[2]).padStart(2, '0') : '00';
        return `${hour}:${min}`;
      }
      return null;
    }

    function parseSize(t) {
      if (t.includes('grande') || t.includes('fechamento')) return 'Grande';
      if (t.includes('media') || t.includes('média')) return 'Média';
      if (t.includes('pequena') || t.includes('delicada') || t.includes('escrita')) return 'Pequena';
      return 'Média';
    }

    const targetDate = parseDate(lower);
    const targetTime = parseTime(lower);
    const targetSize = parseSize(lower);

    // Classificação de Intenção
    let intent = 'CONVERSATION';

    if (lower.includes('agenda de') || lower.includes('como tá a agenda') || lower.includes('como esta a agenda') || lower.includes('ver agenda') || (lower.includes('agenda') && (lower.includes('hoje') || lower.includes('amanha')))) {
      intent = 'SUMMARY';
    } else if (lower.includes('bloquear') || lower.includes('bloqueia') || lower.includes('trava o dia') || lower.includes('travar')) {
      intent = 'BLOCK';
    } else if ((lower.includes('agenda') || lower.includes('agendar') || lower.includes('marcar') || lower.includes('marca')) && targetDate && targetTime) {
      intent = 'BOOK';
    } else if (lower.includes('horário') || lower.includes('horario') || lower.includes('vaga') || lower.includes('disponivel') || lower.includes('disponível') || (targetDate && !targetTime)) {
      intent = 'CHECK_SLOTS';
    }

    let replyText = '';

    // A. Resumo da Agenda
    if (intent === 'SUMMARY') {
      const dateToQuery = targetDate || new Date().toISOString().split('T')[0];
      const summary = await this.getDailySummary(dateToQuery);
      replyText = summary.summaryText;
    }

    // B. Bloqueio de Agenda (Admin)
    else if (intent === 'BLOCK' && isAdmin) {
      const dateToBlock = targetDate || new Date().toISOString().split('T')[0];
      const isFullDay = lower.includes('dia') || !targetTime;
      const blockRes = await this.blockSlot({
        date: dateToBlock,
        start: targetTime || '09:00',
        end: '19:00',
        label: 'Bloqueio via WhatsApp (Admin)',
        fullDay: isFullDay
      });
      replyText = `🔒 *Bloqueio Efetuado!*\n${blockRes.message}`;
    }

    // C. Agendar Diretamente
    else if (intent === 'BOOK') {
      let clientName = senderName;

      // Se for o admin agendando para terceiros (Ex: "agenda o Lucas amanhã...")
      if (isAdmin) {
        const matchName = rawText.match(/(?:agenda(?:r)?|marca(?:r)?)\s+(?:o|a)?\s*([a-zA-ZÀ-ÿ]+)/i);
        if (matchName && matchName[1] && !['uma', 'pra', 'para', 'com', 'no', 'na'].includes(matchName[1].toLowerCase())) {
          clientName = matchName[1].charAt(0).toUpperCase() + matchName[1].slice(1);
        }
      }

      const bookRes = await this.createBooking({
        clientName: clientName,
        clientPhone: isAdmin ? '' : senderPhone,
        date: targetDate,
        time: targetTime,
        size: targetSize,
        artistId: 'Markinhos',
        description: `Tatuagem ${targetSize}`,
        createdByAdmin: isAdmin,
        status: 'approved'
      });

      const [y, m, d] = targetDate.split('-');
      const formattedDate = `${d}/${m}/${y}`;

      if (isAdmin) {
        replyText = `✅ *Agendamento Confirmado pelo Admin!*\n\n👤 *Cliente:* ${clientName}\n📅 *Data:* ${formattedDate} às ${targetTime}\n🎨 *Tamanho:* ${targetSize}\n✍️ *Artista:* Markinhos\n\nJá está registrado na agenda do sistema! 🚀`;
      } else {
        replyText = `🎉 *Tudo Pronto, ${clientName}!*\n\nSeu horário está *CONFIRMADO* no Somos 1 Tattoo Studio! 🖤\n\n📅 *Data:* ${formattedDate}\n⏰ *Horário:* ${targetTime}\n🎨 *Tamanho:* ${targetSize}\n✍️ *Artista:* Markinhos\n📍 *Local:* Somos 1 Tattoo Studio\n\n💡 Qualquer imprevisto, só responder aqui. Te esperamos! 🤘✨`;
      }
    }

    // D. Consultar Horários Disponíveis
    else if (intent === 'CHECK_SLOTS') {
      const dateToQuery = targetDate || new Date().toISOString().split('T')[0];
      const slots = await this.getAvailableSlots(dateToQuery, targetSize);

      const [y, m, d] = dateToQuery.split('-');
      const formattedDate = `${d}/${m}/${y}`;

      if (slots.available && slots.freeSlots?.length > 0) {
        const topSlots = slots.freeSlots.slice(0, 6).join('  •  ');
        replyText = `📅 *Horários Disponíveis para ${slots.dayOfWeek || ''} (${formattedDate}):*\n\n⏰ ${topSlots}\n\nQual desses horários você prefere agendar? Só me responder com a hora desejada (Ex: "Quero às ${slots.freeSlots[0]}")! 🖤`;
      } else {
        replyText = `⚠️ Para o dia *${formattedDate}*, o estúdio não tem horários livres disponíveis (${slots.reason || 'agenda completa'}).\n\nGostaria de verificar para o dia seguinte?`;
      }
    }

    // E. Conversação / Saudação Padrão
    else {
      if (isAdmin) {
        replyText = `Olá, chefe! 🤘 Sou o assistente da agenda do *Somos 1 Tattoo Studio*.\n\nVocê pode me pedir:\n• *"Agenda o [Nome] [data] às [horário]"*\n• *"Como tá a agenda de hoje / amanhã?"*\n• *"Bloqueia o dia [data]"*\n\nO que deseja fazer agora?`;
      } else {
        replyText = `Olá, ${senderName}! 🖤 Tudo bem? Bem-vindo(a) ao *Somos 1 Tattoo Studio*!\n\nSou o assistente virtual de agendamentos. Para marcar seu horário ou tirar dúvidas, você pode:\n\n1. Me dizer qual dia você gostaria de tatuar (Ex: *"Quais horários tem na sexta?"*)\n2. Dizer o horário desejado (Ex: *"Quero agendar amanhã às 15h"*)\n\nComo posso te ajudar hoje? 🤘✨`;
      }
    }

    return {
      intent,
      isAdmin,
      targetDate,
      targetTime,
      targetSize,
      replyText
    };
  }
};
