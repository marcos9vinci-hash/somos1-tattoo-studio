// Standalone Vercel Serverless Function for WhatsApp AI Agent
// Zero npm dependencies - Uses native fetch and Firestore REST API directly.

const FIREBASE_API_KEY = "AIzaSyAhIXcG4ReuncxNBZSqjXYOu7Exka_TNo0";
const FIRESTORE_BASE = "https://firestore.googleapis.com/v1/projects/memorizeai-7b8fd/databases/ai-studio-dcd3cc7e-f58b-453b-a948-88e194766ac9/documents";

const EVOLUTION_HOST = 'p01--evolution--6n2dx6dsdlsf.code.run';
const EVOLUTION_APIKEY = '020F2F224360-40F7-B022-D17AB8E529E2';
const EVOLUTION_INSTANCE = 'wats';

function timeToMins(str) {
  if (!str) return 0;
  const [h, m] = str.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function minsToTime(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

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

async function getAvailableSlots(targetDate, targetSize = 'Pequena') {
  const queryUrl = `${FIRESTORE_BASE}:runQuery?key=${FIREBASE_API_KEY}`;
  const queryBody = {
    structuredQuery: {
      from: [{ collectionId: 'bookings' }],
      where: {
        fieldFilter: {
          field: { fieldPath: 'date' },
          op: 'EQUAL',
          value: { stringValue: targetDate }
        }
      }
    }
  };
  const res = await fetch(queryUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(queryBody)
  });
  const items = await res.json();
  const busyIntervals = (Array.isArray(items) ? items : [])
    .filter(i => i.document && i.document.fields)
    .map(i => {
      const f = i.document.fields;
      const start = timeToMins(f.time?.stringValue || '00:00');
      const dur = Number(f.duration?.integerValue || 60);
      return { start, end: start + dur, status: f.status?.stringValue || '' };
    })
    .filter(i => i.status !== 'cancelled');

  const openMins = 9 * 60;
  const closeMins = 22 * 60;
  const needed = targetSize === 'Grande' ? 240 : (targetSize === 'Média' ? 120 : 60);

  const freeSlots = [];
  for (let slot = openMins; slot + needed <= closeMins; slot += 60) {
    const slotEnd = slot + needed;
    const collision = busyIntervals.some(b => (slot < b.end && slotEnd > b.start));
    if (!collision) {
      freeSlots.push(minsToTime(slot));
    }
  }

  const [y, m, d] = targetDate.split('-');
  const formattedDate = `${d}/${m}/${y}`;

  return { date: targetDate, formattedDate, freeSlots };
}

async function getDailySummary(targetDate) {
  const queryUrl = `${FIRESTORE_BASE}:runQuery?key=${FIREBASE_API_KEY}`;
  const queryBody = {
    structuredQuery: {
      from: [{ collectionId: 'bookings' }],
      where: {
        fieldFilter: {
          field: { fieldPath: 'date' },
          op: 'EQUAL',
          value: { stringValue: targetDate }
        }
      }
    }
  };
  const res = await fetch(queryUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(queryBody)
  });
  const items = await res.json();
  const active = (Array.isArray(items) ? items : [])
    .filter(i => i.document && i.document.fields)
    .map(i => {
      const f = i.document.fields;
      return {
        client: f.clientName?.stringValue || 'Cliente sem nome',
        phone: f.clientPhone?.stringValue || '',
        time: f.time?.stringValue || '00:00',
        size: f.size?.stringValue || 'Média',
        status: f.status?.stringValue || 'pendente'
      };
    })
    .filter(b => b.status !== 'cancelled')
    .sort((a, b) => timeToMins(a.time) - timeToMins(b.time));

  return active;
}

async function createBooking(data) {
  const duration = data.size === 'Grande' ? 240 : (data.size === 'Média' ? 120 : 60);
  const createUrl = `${FIRESTORE_BASE}/bookings?key=${FIREBASE_API_KEY}`;
  const docData = {
    fields: {
      clientName: { stringValue: data.clientName || 'Cliente' },
      clientPhone: { stringValue: data.clientPhone || '' },
      date: { stringValue: data.date },
      time: { stringValue: data.time },
      duration: { integerValue: duration },
      size: { stringValue: data.size || 'Média' },
      artistId: { stringValue: 'Markinhos' },
      description: { stringValue: `Tatuagem ${data.size || 'Média'} (Agendada via WhatsApp)` },
      status: { stringValue: data.status || 'approved' },
      createdAt: { timestampValue: new Date().toISOString() },
      source: { stringValue: 'whatsapp_ai_agent' }
    }
  };

  const res = await fetch(createUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(docData)
  });
  return { success: res.status === 200, status: res.status };
}

async function sendWhatsAppMessage(number, text) {
  const url = `https://${EVOLUTION_HOST}/message/sendText/${EVOLUTION_INSTANCE}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'apikey': EVOLUTION_APIKEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      number,
      text,
      linkPreview: true
    })
  });
  return res.json();
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const url = new URL(req.url, `https://${req.headers.host || 'somos1-tattoo-studio.vercel.app'}`);
  const action = url.searchParams.get('action') || req.query?.action;

  try {
    // Health check
    if (action === 'health' || req.method === 'GET' && !action) {
      return res.status(200).json({ status: 'ok', service: 'Somos 1 WhatsApp Agent' });
    }

    // Slots
    if (action === 'slots') {
      const date = url.searchParams.get('date') || req.query?.date || new Date().toISOString().split('T')[0];
      const size = url.searchParams.get('size') || req.query?.size || 'Pequena';
      const slots = await getAvailableSlots(date, size);
      return res.status(200).json(slots);
    }

    // Summary
    if (action === 'summary') {
      const date = url.searchParams.get('date') || req.query?.date || new Date().toISOString().split('T')[0];
      const summary = await getDailySummary(date);
      return res.status(200).json({ date, bookings: summary });
    }

    // Webhook POST from Evolution API
    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      
      // Filtrar se não for mensagem
      if (body?.event && body.event !== 'messages.upsert') {
        return res.status(200).json({ status: 'ignored_not_message' });
      }

      const data = body?.data || body || {};
      const key = data.key || {};

      if (key.fromMe) {
        return res.status(200).json({ status: 'ignored_from_me' });
      }

      const remoteJid = key.remoteJid || '';
      if (remoteJid.includes('@g.us') || remoteJid.includes('status@broadcast')) {
        return res.status(200).json({ status: 'ignored_group' });
      }

      const senderPhone = remoteJid.replace('@s.whatsapp.net', '').replace(/\D/g, '');
      const senderName = data.pushName || 'Cliente';

      let userText = '';
      const msg = data.message || {};
      if (msg.conversation) userText = msg.conversation;
      else if (msg.extendedTextMessage?.text) userText = msg.extendedTextMessage.text;
      else if (msg.imageMessage?.caption) userText = msg.imageMessage.caption;
      else if (msg.audioMessage) userText = '[Mensagem de áudio recebida]';

      if (!userText || !userText.trim()) {
        return res.status(200).json({ status: 'empty_text' });
      }

      const adminPhones = ['5511948116922', '5511957837132'];
      const isAdmin = adminPhones.includes(senderPhone);
      const text = userText.toLowerCase();

      const targetDate = parseDate(text) || new Date().toISOString().split('T')[0];
      const targetTime = parseTime(text);
      const targetSize = parseSize(text);

      let replyText = '';

      // A. Resumo da Agenda
      if (text.includes('agenda de') || text.includes('como tá a agenda') || text.includes('como esta a agenda') || (text.includes('agenda') && (text.includes('hoje') || text.includes('amanha')))) {
        const bookings = await getDailySummary(targetDate);
        const [y, m, d] = targetDate.split('-');
        const formattedDate = `${d}/${m}/${y}`;

        if (bookings.length === 0) {
          replyText = `📅 *Agenda para ${formattedDate}:*\n\nNenhum agendamento confirmado para este dia até o momento. A agenda está livre! ✨`;
        } else {
          const lines = bookings.map((b, idx) => {
            const statusBadge = b.status === 'approved' ? '✅' : '⏳';
            return `${idx + 1}. ${statusBadge} *${b.time}* - ${b.client} (Tattoo ${b.size})`;
          }).join('\n');
          replyText = `📅 *Agenda do Somos 1 Studio (${formattedDate}):*\n\n${lines}\n\nTotal de clientes: *${bookings.length}* 🚀`;
        }
      }

      // B. Agendar
      else if ((text.includes('agenda') || text.includes('agendar') || text.includes('marcar') || text.includes('marca')) && targetDate && targetTime) {
        let clientName = senderName;
        if (isAdmin) {
          const matchName = userText.match(/(?:agenda(?:r)?|marca(?:r)?)\s+(?:o|a)?\s*([a-zA-ZÀ-ÿ]+)/i);
          if (matchName && matchName[1] && !['uma', 'pra', 'para', 'com', 'no', 'na', 'minha'].includes(matchName[1].toLowerCase())) {
            clientName = matchName[1].charAt(0).toUpperCase() + matchName[1].slice(1);
          }
        }

        await createBooking({
          clientName,
          clientPhone: isAdmin ? '' : senderPhone,
          date: targetDate,
          time: targetTime,
          size: targetSize,
          status: isAdmin ? 'approved' : 'pending_approval'
        });

        const [y, m, d] = targetDate.split('-');
        const formattedDate = `${d}/${m}/${y}`;

        if (isAdmin) {
          replyText = `✅ *Agendamento Confirmado pelo Chefe!*\n\n👤 *Cliente:* ${clientName}\n📅 *Data:* ${formattedDate} às *${targetTime}*\n🎨 *Tamanho:* ${targetSize}\n✍️ *Artista:* Markinhos\n\nJá está gravado no sistema e bloqueado na agenda! 🚀`;
        } else {
          replyText = `🎉 *Agendamento Recebido com Sucesso, ${clientName}!* 🖤\n\n📅 *Data:* ${formattedDate}\n⏰ *Horário:* ${targetTime}\n🎨 *Tamanho:* ${targetSize}\n✍️ *Artista:* Markinhos\n📍 *Local:* Rua Francesco de Martini 29, São Caetano do Sul\n\nSeu horário está pré-reservado. Qualquer dúvida ou imprevisto, é só me chamar por aqui! Te esperamos 🤘✨`;
        }
      }

      // C. Consultar horários
      else if (text.includes('horário') || text.includes('horario') || text.includes('vaga') || text.includes('livre') || text.includes('disponivel') || text.includes('disponível') || (targetDate && !targetTime && (text.includes('dia') || text.includes('quando')))) {
        const slotsInfo = await getAvailableSlots(targetDate, targetSize);
        if (slotsInfo.freeSlots.length > 0) {
          const slotsDisplay = slotsInfo.freeSlots.slice(0, 6).join('   •   ');
          replyText = `📅 *Horários Livres para ${slotsInfo.formattedDate}:*\n\n⏰ ${slotsDisplay}\n\nQual horário fica melhor para você? Responda aqui com a hora que preferir (Ex: *"Quero às ${slotsInfo.freeSlots[0]}"*)! 🖤`;
        } else {
          replyText = `⚠️ Para o dia *${slotsInfo.formattedDate}*, todos os horários já estão preenchidos! Gostaria de verificar para o próximo dia útil?`;
        }
      }

      // D. Conversação padrão
      else {
        if (isAdmin) {
          replyText = `Fala, Markinhos! 🤘 Sou o assistente inteligente da sua agenda.\n\nComandos rápidos que você pode me mandar:\n• *"Agenda o [Nome] amanhã às 14h tattoo média"*\n• *"Como tá a agenda de amanhã?"*\n• *"Bloqueia o dia [data]"*\n\nO que manda agora?`;
        } else {
          replyText = `Olá, ${senderName}! 🖤 Bem-vindo(a) ao *Somos 1 Tattoo Studio*!\n\nSou o assistente virtual de agendamentos. Para marcar sua tattoo ou consultar datas disponíveis, me diga:\n\n1. Qual dia você gostaria de vir? (Ex: *"Quais horários tem na sexta?"*)\n2. Ou me diga direto o horário: (Ex: *"Quero agendar amanhã às 15h"*)\n\nComo posso te ajudar hoje? 🤘✨`;
        }
      }

      // Enviar resposta no WhatsApp
      await sendWhatsAppMessage(senderPhone, replyText);

      return res.status(200).json({ status: 'success', repliedTo: senderPhone });
    }

    return res.status(404).json({ error: 'Not found' });
  } catch (err) {
    console.error('Handler error:', err);
    return res.status(500).json({ error: err.message });
  }
}
