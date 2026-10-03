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

function parsePrice(t) {
  const m = t.match(/(?:valor|r\$|por|custo|preco|preço)\s*[:=]?\s*(\d{2,4})/i) || t.match(/r\$\s*(\d{2,4})/i);
  return m ? parseFloat(m[1]) : 0;
}

function parseDeposit(t) {
  const m = t.match(/(?:sinal|entrada)\s*[:=]?\s*(\d{2,4})/i);
  return m ? parseFloat(m[1]) : 0;
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
  const priceEstimated = data.priceEstimated || (data.size === 'Grande' ? 800 : (data.size === 'Média' ? 450 : 200));
  const depositPaid = data.depositPaid || 0;
  const createUrl = `${FIRESTORE_BASE}/bookings?key=${FIREBASE_API_KEY}`;
  const docData = {
    fields: {
      userName: { stringValue: data.clientName || 'Cliente' },
      userPhone: { stringValue: data.clientPhone || '' },
      clientName: { stringValue: data.clientName || 'Cliente' },
      clientPhone: { stringValue: data.clientPhone || '' },
      date: { stringValue: data.date },
      time: { stringValue: data.time },
      duration: { integerValue: duration },
      size: { stringValue: data.size || 'Média' },
      priceEstimated: { doubleValue: Number(priceEstimated) },
      depositPaid: { doubleValue: Number(depositPaid) },
      artistId: { stringValue: 'Markinhos' },
      description: { stringValue: data.description || `Tatuagem ${data.size || 'Média'} (Agendada via WhatsApp)` },
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

  // Também cria ou atualiza lead correspondente na coluna "agendado" do Funil Comercial
  try {
    const leadUrl = `${FIRESTORE_BASE}/leads?key=${FIREBASE_API_KEY}`;
    await fetch(leadUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          nome: { stringValue: data.clientName || 'Cliente' },
          telefone: { stringValue: data.clientPhone || '' },
          estagio: { stringValue: 'agendado' },
          temperatura: { stringValue: 'quente' },
          origem: { stringValue: 'whatsapp' },
          ideiaProjeto: { stringValue: `Tattoo tamanho ${data.size || 'Média'} em ${data.date} às ${data.time}` },
          tamanhoAproximado: { stringValue: data.size || 'Média' },
          createdAt: { timestampValue: new Date().toISOString() },
          updatedAt: { timestampValue: new Date().toISOString() }
        }
      })
    });
  } catch (leadErr) {
    console.warn('Erro ao criar lead para booking:', leadErr);
  }

  return { success: res.status === 200, status: res.status };
}

async function findActiveBookingForClient(clientName, clientPhone) {
  try {
    const queryUrl = `${FIRESTORE_BASE}:runQuery?key=${FIREBASE_API_KEY}`;
    const res = await fetch(queryUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: 'bookings' }],
          limit: 100
        }
      })
    });
    const items = await res.json();
    if (!Array.isArray(items)) return null;

    const normName = (clientName || '').toLowerCase().trim();
    const cleanPhone = (clientPhone || '').replace(/\D/g, '');

    for (const item of items) {
      if (!item.document || !item.document.fields) continue;
      const f = item.document.fields;
      const st = f.status?.stringValue || '';
      if (st === 'cancelled' || st === 'no_show' || st === 'completed') continue;

      const bName = (f.userName?.stringValue || f.clientName?.stringValue || '').toLowerCase().trim();
      const bPhone = (f.userPhone?.stringValue || f.clientPhone?.stringValue || '').replace(/\D/g, '');

      const phoneMatch = cleanPhone && bPhone && (cleanPhone === bPhone || cleanPhone.endsWith(bPhone) || bPhone.endsWith(cleanPhone));
      const nameMatch = normName && bName && (normName.includes(bName) || bName.includes(normName));

      if (phoneMatch || nameMatch) {
        const docName = item.document.name;
        const id = docName.split('/').pop();
        return { id, fields: f, docName };
      }
    }
    return null;
  } catch (err) {
    console.warn('Erro ao buscar booking ativo:', err);
    return null;
  }
}

async function updateBookingDateTime(bookingId, newDate, newTime) {
  try {
    const patchUrl = `${FIRESTORE_BASE}/bookings/${bookingId}?updateMask.fieldPaths=date&updateMask.fieldPaths=time&updateMask.fieldPaths=updatedAt&key=${FIREBASE_API_KEY}`;
    const res = await fetch(patchUrl, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          date: { stringValue: newDate },
          time: { stringValue: newTime },
          updatedAt: { timestampValue: new Date().toISOString() }
        }
      })
    });
    return res.status === 200;
  } catch (err) {
    console.warn('Erro ao atualizar booking:', err);
    return false;
  }
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

      let remoteJid = key.remoteJid || '';
      // Suporte para contas WhatsApp com privacy LID (e.g., iPhone / Business)
      if (remoteJid.includes('@lid') && key.remoteJidAlt && key.remoteJidAlt.includes('@s.whatsapp.net')) {
        remoteJid = key.remoteJidAlt;
      }

      if (remoteJid.includes('@g.us') || remoteJid.includes('status@broadcast') || remoteJid.includes('@newsletter')) {
        return res.status(200).json({ status: 'ignored_group' });
      }

      const senderPhone = remoteJid.replace('@s.whatsapp.net', '').replace('@lid', '').replace(/\D/g, '');
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

      // ATENDIMENTO DE CLIENTES VIA WHATSAPP (Sincronização com CRM & Chat)
      if (!isAdmin) {
        // 1. Salva a mensagem recebida no CRM (coleção unificada crm_messages)
        try {
          const msgDocUrl = `${FIRESTORE_BASE}/crm_messages?key=${FIREBASE_API_KEY}`;
          await fetch(msgDocUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fields: {
                telefone: { stringValue: senderPhone },
                clienteNome: { stringValue: senderName },
                mensagem: { stringValue: userText },
                remetente: { stringValue: 'cliente' },
                timestamp: { timestampValue: new Date().toISOString() },
                status: { stringValue: 'entregue' }
              }
            })
          });
        } catch (msgErr) {
          console.warn('Erro ao salvar crm_messages:', msgErr);
        }

        // 2. Busca se o lead já existe na coleção leads pelo telefone
        let existingLead = null;
        try {
          const queryLeadUrl = `${FIRESTORE_BASE}:runQuery?key=${FIREBASE_API_KEY}`;
          const qRes = await fetch(queryLeadUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              structuredQuery: {
                from: [{ collectionId: 'leads' }],
                where: {
                  fieldFilter: {
                    field: { fieldPath: 'telefone' },
                    op: 'EQUAL',
                    value: { stringValue: senderPhone }
                  }
                },
                limit: 1
              }
            })
          });
          const qItems = await qRes.json();
          if (Array.isArray(qItems) && qItems[0]?.document) {
            existingLead = qItems[0].document;
          }
        } catch (qErr) {
          console.warn('Erro ao consultar lead por telefone:', qErr);
        }

        // 3. Se não existe lead, cadastra na coluna 'novo'. Se já existe, atualiza a última mensagem
        if (!existingLead) {
          try {
            const createLeadUrl = `${FIRESTORE_BASE}/leads?key=${FIREBASE_API_KEY}`;
            await fetch(createLeadUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                fields: {
                  nome: { stringValue: senderName },
                  telefone: { stringValue: senderPhone },
                  estagio: { stringValue: 'novo' },
                  temperatura: { stringValue: 'quente' },
                  origem: { stringValue: 'whatsapp' },
                  ultimaMensagem: { stringValue: userText },
                  pilotoIA: { booleanValue: false },
                  createdAt: { timestampValue: new Date().toISOString() },
                  updatedAt: { timestampValue: new Date().toISOString() }
                }
              })
            });
          } catch (createErr) {
            console.warn('Erro ao criar novo lead:', createErr);
          }
        } else {
          try {
            const leadDocName = existingLead.name;
            const updateLeadUrl = `https://firestore.googleapis.com/v1/${leadDocName}?updateMask.fieldPaths=ultimaMensagem&updateMask.fieldPaths=updatedAt&key=${FIREBASE_API_KEY}`;
            await fetch(updateLeadUrl, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                fields: {
                  ultimaMensagem: { stringValue: userText },
                  updatedAt: { timestampValue: new Date().toISOString() }
                }
              })
            });
          } catch (uErr) {
            console.warn('Erro ao atualizar ultimaMensagem do lead existente:', uErr);
          }
        }

        // 4. Se o Piloto IA estiver ativo para esse lead, o Agente Especialista responde
        const isPilotoAtivo = existingLead?.fields?.pilotoIA?.booleanValue === true;
        const currentStage = existingLead?.fields?.estagio?.stringValue || 'novo';

        if (isPilotoAtivo) {
          let autoReply = '';
          const firstName = senderName.split(' ')[0] || senderName;

          if (currentStage === 'novo') {
            autoReply = `Oi ${firstName}! 😊 Sou a assistente do Somos 1 Tattoo Studio. Vi sua mensagem! Me conta, qual ideia ou estilo de tattoo você tem em mente?`;
          } else if (currentStage === 'qualificacao') {
            autoReply = `Perfeito, ${firstName}! Você já tem alguma imagem de referência ou foto de exemplo? E em qual parte do corpo você pretende fazer?`;
          } else if (currentStage === 'negociacao') {
            autoReply = `Entendi tudo, ${firstName}! Já estou repassando para o Markinhos fechar a estimativa e o sinal de garantia para reservarmos sua data na agenda 🎨`;
          } else if (currentStage === 'agendado') {
            autoReply = `Oi ${firstName}! Sua sessão está confirmada. Nosso estúdio fica na Rua Francesco de Martini 29. Lembra de vir descansado(a) e hidratado(a). Nos vemos lá! 🤘`;
          } else if (currentStage === 'pos_venda' || currentStage === 'concluido') {
            autoReply = `Fala ${firstName}! Passando para saber como está a cicatrização da sua tattoo. Qualquer dúvida sobre os cuidados ou a pomada, só me avisar! ✨`;
          }

          if (autoReply) {
            await sendWhatsAppMessage(senderPhone, autoReply);

            // Salva a resposta do robô no CRM
            try {
              const msgDocUrl = `${FIRESTORE_BASE}/crm_messages?key=${FIREBASE_API_KEY}`;
              await fetch(msgDocUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  fields: {
                    telefone: { stringValue: senderPhone },
                    clienteNome: { stringValue: senderName },
                    mensagem: { stringValue: autoReply },
                    remetente: { stringValue: 'ia' },
                    timestamp: { timestampValue: new Date().toISOString() },
                    status: { stringValue: 'entregue' }
                  }
                })
              });
            } catch (rErr) {
              console.warn('Erro ao salvar resposta da IA:', rErr);
            }
          }

          return res.status(200).json({ status: 'client_handled_by_agent', stage: currentStage });
        }

        // Se piloto estiver desligado, apenas registrou no CRM para atendimento humano
        return res.status(200).json({ status: 'client_saved_to_crm', message: 'Mensagem registrada no chat do CRM.' });
      }

      const text = userText.toLowerCase();

      const targetDate = parseDate(text) || new Date().toISOString().split('T')[0];
      const targetTime = parseTime(text);
      const targetSize = parseSize(text);

      let replyText = '';

      // Confirmação de Presença de Cliente (Comando Admin WhatsApp)
      // Ex: "o Tiago veio", "Akila compareceu", "fulano faltou", "sim, compareceu", "conclui a sessão da Akila"
      const isPresencaSim = (text.includes('compareceu') || text.includes('veio') || text.includes('tatuou') || text.includes('conclui') || text.includes('concluído') || text.includes('concluido')) && !text.includes('não') && !text.includes('nao');
      const isPresencaNao = (text.includes('faltou') || text.includes('não veio') || text.includes('nao veio') || text.includes('não compareceu') || text.includes('nao compareceu') || text.includes('desmarcou') || text.includes('cancelou'));

      if (isAdmin && (isPresencaSim || isPresencaNao)) {
        const matchName = userText.match(/(?:o|a|cliente|sessão\s+d[oa]|agendamento\s+d[oa])?\s*([A-ZÀ-ÿ][a-zà-ÿ]+)/i);
        let targetName = matchName && matchName[1] ? matchName[1] : '';
        if (['Sim', 'Nao', 'Não', 'O', 'A', 'Hoje', 'Ontem', 'Que', 'Como'].includes(targetName)) targetName = '';

        let bookingToConfirm = null;
        try {
          const queryUrl = `${FIRESTORE_BASE}:runQuery?key=${FIREBASE_API_KEY}`;
          const qRes = await fetch(queryUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              structuredQuery: {
                from: [{ collectionId: 'bookings' }],
                limit: 40
              }
            })
          });
          const bItems = await qRes.json();
          const list = (Array.isArray(bItems) ? bItems : []).filter(i => i.document?.fields).map(i => {
            const f = i.document.fields;
            return {
              id: i.document.name.split('/').pop(),
              name: f.userName?.stringValue || f.clientName?.stringValue || '',
              date: f.date?.stringValue || '',
              time: f.time?.stringValue || '',
              phone: f.userPhone?.stringValue || f.clientPhone?.stringValue || '',
              status: f.status?.stringValue || ''
            };
          });

          if (targetName) {
            bookingToConfirm = list.find(b => b.name.toLowerCase().includes(targetName.toLowerCase()));
          }
          if (!bookingToConfirm) {
            const todayStr = new Date().toISOString().split('T')[0];
            bookingToConfirm = list.find(b => b.date <= todayStr && (b.status === 'approved' || b.status === 'deposit_paid'));
          }
        } catch (bErr) {
          console.warn('Erro ao buscar booking para confirmação:', bErr);
        }

        if (bookingToConfirm) {
          const newStatus = isPresencaSim ? 'completed' : 'no_show';
          try {
            await fetch(`${FIRESTORE_BASE}/bookings/${bookingToConfirm.id}?updateMask.fieldPaths=status&updateMask.fieldPaths=updatedAt&key=${FIREBASE_API_KEY}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                fields: {
                  status: { stringValue: newStatus },
                  updatedAt: { timestampValue: new Date().toISOString() }
                }
              })
            });
          } catch (patchErr) {}

          try {
            const leadStage = isPresencaSim ? 'pos_venda' : 'followup';
            const leadTemp = isPresencaSim ? 'quente' : 'morno';
            const lRes = await fetch(`${FIRESTORE_BASE}:runQuery?key=${FIREBASE_API_KEY}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                structuredQuery: {
                  from: [{ collectionId: 'leads' }],
                  where: {
                    fieldFilter: {
                      field: { fieldPath: 'nome' },
                      op: 'EQUAL',
                      value: { stringValue: bookingToConfirm.name }
                    }
                  },
                  limit: 1
                }
              })
            });
            const lItems = await lRes.json();
            if (Array.isArray(lItems) && lItems[0]?.document) {
              const lId = lItems[0].document.name.split('/').pop();
              await fetch(`${FIRESTORE_BASE}/leads/${lId}?updateMask.fieldPaths=estagio&updateMask.fieldPaths=temperatura&updateMask.fieldPaths=updatedAt&key=${FIREBASE_API_KEY}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  fields: {
                    estagio: { stringValue: leadStage },
                    temperatura: { stringValue: leadTemp },
                    updatedAt: { timestampValue: new Date().toISOString() }
                  }
                })
              });
            }
          } catch (leadSyncErr) {}

          if (isPresencaSim) {
            replyText = `✅ *Presença Confirmada, Chefe!*\n\n👤 *Cliente:* ${bookingToConfirm.name}\n📅 *Sessão:* ${bookingToConfirm.date} às ${bookingToConfirm.time}\n\nO status foi alterado para *Concluído*, o lead foi movido para *Pós-Venda (Cicatrização / 15 dias)* e o cliente classificado como *🔥 Quente* na Carteira! 🚀`;
          } else {
            replyText = `❌ *Falta Registrada, Chefe!*\n\n👤 *Cliente:* ${bookingToConfirm.name}\n📅 *Sessão:* ${bookingToConfirm.date} às ${bookingToConfirm.time}\n\nO status foi alterado para *Faltou*, o lead foi movido para *Follow-up / Resgate* e o cliente marcado como *desmarcou* na Carteira para reativação futura. ⚠️`;
          }
        } else {
          replyText = `⚠️ Chefe, não encontrei nenhum agendamento pendente ${targetName ? `com o nome *${targetName}*` : 'para hoje'}. Verifique no painel ou digite o nome completo do cliente!`;
        }
      }

      // A. Resumo da Agenda
      else if (text.includes('agenda de') || text.includes('como tá a agenda') || text.includes('como esta a agenda') || (text.includes('agenda') && (text.includes('hoje') || text.includes('amanha')))) {
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

      // B. Agendar / Reagendar
      else if ((text.includes('agenda') || text.includes('agendar') || text.includes('marcar') || text.includes('marca') || text.includes('reagenda') || text.includes('remarca') || text.includes('muda') || text.includes('troca')) && targetDate && targetTime) {
        let clientName = senderName;
        if (isAdmin) {
          const matchName = userText.match(/(?:agenda(?:r)?|marca(?:r)?|reagenda(?:r)?|remarca(?:r)?|muda(?:r)?|troca(?:r)?)\s+(?:o|a|de|hor[aá]rio\s+d[oa])?\s*([a-zA-ZÀ-ÿ]+)/i);
          if (matchName && matchName[1] && !['uma', 'pra', 'para', 'com', 'no', 'na', 'minha'].includes(matchName[1].toLowerCase())) {
            clientName = matchName[1].charAt(0).toUpperCase() + matchName[1].slice(1);
          }
        }

        const isReagendamento = text.includes('reagenda') || text.includes('remarca') || text.includes('muda') || text.includes('troca') || text.includes('altera');
        const [y, m, d] = targetDate.split('-');
        const formattedDate = `${d}/${m}/${y}`;

        // Verifica se já existe um agendamento ativo para esse cliente para não duplicar!
        const existingBooking = await findActiveBookingForClient(clientName, isAdmin ? '' : senderPhone);

        if (existingBooking && (isReagendamento || existingBooking.fields?.date?.stringValue === targetDate)) {
          // ATUALIZA O AGENDAMENTO EXISTENTE (Sem duplicar!)
          await updateBookingDateTime(existingBooking.id, targetDate, targetTime);

          if (isAdmin) {
            replyText = `🔄 *Reagendamento Atualizado com Sucesso!*\n\n👤 *Cliente:* ${clientName}\n📅 *Novo Horário:* ${formattedDate} às *${targetTime}*\n\nO agendamento anterior foi remarcado na agenda sem duplicidade! 🚀`;
          } else {
            replyText = `🔄 *Horário Alterado com Sucesso, ${clientName}!* 🖤\n\nSeu agendamento foi atualizado para *${formattedDate} às ${targetTime}*.\n📍 *Local:* Rua Francesco de Martini 29. Até lá! 🤘✨`;
          }
        } else {
          // Cria novo agendamento
          const price = parsePrice(text);
          const deposit = parseDeposit(text);

          await createBooking({
            clientName,
            clientPhone: isAdmin ? '' : senderPhone,
            date: targetDate,
            time: targetTime,
            size: targetSize,
            priceEstimated: price,
            depositPaid: deposit,
            description: `Tatuagem ${targetSize}${price > 0 ? ` (R$ ${price})` : ''}`,
            status: isAdmin ? 'approved' : 'pending_approval'
          });

          if (isAdmin) {
            replyText = `✅ *Agendamento Confirmado pelo Chefe!*\n\n👤 *Cliente:* ${clientName}\n📅 *Data:* ${formattedDate} às *${targetTime}*\n🎨 *Tamanho:* ${targetSize}${price > 0 ? `\n💰 *Valor:* R$ ${price}` : ''}${deposit > 0 ? ` (Sinal: R$ ${deposit})` : ''}\n✍️ *Artista:* Markinhos\n\nJá está gravado no sistema e bloqueado na agenda! 🚀`;
          } else {
            replyText = `🎉 *Agendamento Recebido com Sucesso, ${clientName}!* 🖤\n\n📅 *Data:* ${formattedDate}\n⏰ *Horário:* ${targetTime}\n🎨 *Tamanho:* ${targetSize}${price > 0 ? `\n💰 *Estimativa:* R$ ${price}` : ''}\n✍️ *Artista:* Markinhos\n📍 *Local:* Rua Francesco de Martini 29, São Caetano do Sul\n\nSeu horário está pré-reservado. Qualquer dúvida ou imprevisto, é só me chamar por aqui! Te esperamos 🤘✨`;
          }
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
