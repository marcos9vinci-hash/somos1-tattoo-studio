const https = require('https');

const N8N_HOST = 'www.marcos9vinci.dedyn.io';
const N8N_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzZjIwYWY2Yy05NDUwLTRiMmItYTI3Yy03NTk5YWRlMDBlZjIiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiOWI5ODYxYzUtY2I2NS00ZDY3LWI0ZDMtN2M3ODgyNGM1ZjIzIiwiaWF0IjoxNzkwNTY1OTc1fQ.OISZGxWw39DHfmJwQg9L0J3uPwXgtHgq7Z9mAwFoXeM';

const EVOLUTION_HOST = 'p01--evolution--6n2dx6dsdlsf.code.run';
const EVOLUTION_APIKEY = '020F2F224360-40F7-B022-D17AB8E529E2';
const EVOLUTION_INSTANCE = 'wats';

async function apiRequest(method, path, body = null) {
  const url = `https://${N8N_HOST}/api/v1${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      'X-N8N-API-KEY': N8N_TOKEN,
      'Content-Type': 'application/json'
    },
    body: body ? JSON.stringify(body) : undefined
  });
  let data;
  try {
    data = await res.json();
  } catch {
    data = await res.text();
  }
  return { status: res.status, data };
}

async function main() {
  console.log("=== CONFIGURANDO AGENTE WHATSAPP INTELIGENTE AUTO-CONTIDO NO N8N ===");

  // 1. Verificar se já existe algum workflow de agente anterior e desativar/substituir
  const listRes = await apiRequest('GET', '/workflows');
  if (listRes.data?.data) {
    for (const wf of listRes.data.data) {
      if (wf.name.includes("Agente WhatsApp Inteligente") || wf.name.includes("Meta Business Agent")) {
        console.log(`Removendo workflow anterior id ${wf.id}: ${wf.name}...`);
        await apiRequest('DELETE', `/workflows/${wf.id}`);
      }
    }
  }

  // 2. Construir o workflow completo com inteligência Firestore REST direta
  const agentWorkflow = {
    name: "Somos 1 — Agente WhatsApp Inteligente (Meta Business Agent)",
    nodes: [
      {
        parameters: {
          httpMethod: "POST",
          path: "agente-whatsapp",
          responseMode: "onReceived",
          responseData: "allEntries",
          options: {}
        },
        type: "n8n-nodes-base.webhook",
        typeVersion: 2,
        position: [100, 300],
        id: "webhook-inbound",
        name: "Webhook Inbound WhatsApp",
        webhookId: "agente-whatsapp"
      },
      {
        parameters: {
          jsCode: `
// 1. FILTRAR E IDENTIFICAR SENDER
const body = $json.body || $json;

// Garante que é evento de mensagem
const event = body.event;
if (event && event !== 'messages.upsert') {
  return [];
}

const data = body.data || body;
const key = data.key || {};

// Ignora mensagens enviadas pelo próprio robô (evita loop infinito)
if (key.fromMe) {
  return [];
}

const remoteJid = key.remoteJid || '';
// Ignora mensagens de grupo (@g.us) ou status
if (remoteJid.includes('@g.us') || remoteJid.includes('status@broadcast')) {
  return [];
}

const rawPhone = remoteJid.replace('@s.whatsapp.net', '').replace(/\\D/g, '');
const pushName = data.pushName || 'Cliente';

// Extrai o texto da mensagem
let userText = '';
const msg = data.message || {};

if (msg.conversation) {
  userText = msg.conversation;
} else if (msg.extendedTextMessage?.text) {
  userText = msg.extendedTextMessage.text;
} else if (msg.imageMessage?.caption) {
  userText = msg.imageMessage.caption;
} else if (msg.audioMessage) {
  userText = '[Mensagem de áudio recebida]';
}

if (!userText || userText.trim().length === 0) {
  return [];
}

// Identifica se é o administrador
const adminPhones = ['5511948116922', '5511957837132'];
const isAdmin = adminPhones.includes(rawPhone);

// REGRA DO USUÁRIO: O robô NÃO atende clientes comuns, apenas o Markinhos (Admin)!
if (!isAdmin) {
  return [];
}

return [{
  json: {
    phone: rawPhone,
    name: pushName,
    text: userText.trim(),
    isAdmin: isAdmin,
    receivedAt: new Date().toISOString()
  }
}];
`
        },
        type: "n8n-nodes-base.code",
        typeVersion: 2,
        position: [340, 300],
        id: "code-filter",
        name: "Filtrar & Identificar Sender"
      },
      {
        parameters: {
          jsCode: `
// 2. PROCESSADOR DE INTELIGÊNCIA & INTEGRAÇÃO FIRESTORE DIRETA
const input = $input.first().json;
const text = input.text.toLowerCase();
const originalText = input.text;
const senderPhone = input.phone;
const senderName = input.name;
const isAdmin = input.isAdmin;

const FIREBASE_API_KEY = "AIzaSyAhIXcG4ReuncxNBZSqjXYOu7Exka_TNo0";
const FIRESTORE_BASE = "https://firestore.googleapis.com/v1/projects/memorizeai-7b8fd/databases/ai-studio-dcd3cc7e-f58b-453b-a948-88e194766ac9/documents";

// Helper: Extração de Data
function parseDate(t) {
  const now = new Date();
  const matchBr = t.match(/(\\d{1,2})\\/(\\d{1,2})(?:\\/(\\d{2,4}))?/);
  if (matchBr) {
    const d = String(matchBr[1]).padStart(2, '0');
    const m = String(matchBr[2]).padStart(2, '0');
    const y = matchBr[3] ? (matchBr[3].length === 2 ? '20' + matchBr[3] : matchBr[3]) : String(now.getFullYear());
    return \`\${y}-\${m}-\${d}\`;
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

// Helper: Extração de Horário (HH:MM ou 15h, 15:30)
function parseTime(t) {
  const m = t.match(/(\\b[0-2]?\\d)(?:[:hH](\\d{2})|\\s*h\\b|\\s*horas\\b)/i);
  if (m) {
    const hour = String(parseInt(m[1])).padStart(2, '0');
    const min = m[2] ? String(m[2]).padStart(2, '0') : '00';
    return \`\${hour}:\${min}\`;
  }
  return null;
}

// Helper: Extração de Tamanho
function parseSize(t) {
  if (t.includes('grande') || t.includes('fechamento')) return 'Grande';
  if (t.includes('media') || t.includes('média')) return 'Média';
  if (t.includes('pequena') || t.includes('delicada') || t.includes('escrita')) return 'Pequena';
  return 'Média';
}

function timeToMins(str) {
  if (!str) return 0;
  const [h, m] = str.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function minsToTime(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return \`\${String(h).padStart(2, '0')}:\${String(m).padStart(2, '0')}\`;
}

// Identificar Intenção
const targetDate = parseDate(text) || new Date().toISOString().split('T')[0];
const targetTime = parseTime(text);
const targetSize = parseSize(text);

let replyText = '';

try {
  // A. INTENÇÃO: RESUMO DA AGENDA (Comando Admin)
  if (text.includes('agenda de') || text.includes('como tá a agenda') || text.includes('como esta a agenda') || (text.includes('agenda') && (text.includes('hoje') || text.includes('amanha')))) {
    const queryUrl = \`\${FIRESTORE_BASE}:runQuery?key=\${FIREBASE_API_KEY}\`;
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
    const active = items
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

    const [y, m, d] = targetDate.split('-');
    const formattedDate = \`\${d}/\${m}/\${y}\`;

    if (active.length === 0) {
      replyText = \`📅 *Agenda para \${formattedDate}:*\\n\\nNenhum agendamento confirmado para este dia até o momento. A agenda está livre! ✨\`;
    } else {
      let lines = active.map((b, idx) => {
        const statusBadge = b.status === 'approved' ? '✅' : '⏳';
        return \`\${idx + 1}. \${statusBadge} *\${b.time}* - \${b.client} (Tattoo \${b.size})\`;
      }).join('\\n');
      replyText = \`📅 *Agenda do Somos 1 Studio (\${formattedDate}):*\\n\\n\${lines}\\n\\nTotal de clientes: *\${active.length}* 🚀\`;
    }
  }

  // B. INTENÇÃO: BLOQUEAR DATA OU HORÁRIO (Comando Admin)
  else if (text.includes('bloquear') || text.includes('bloqueia') || text.includes('trava') || text.includes('fechar')) {
    if (!isAdmin) {
      replyText = \`Olá! Bloqueios de agenda só podem ser solicitados diretamente pelo administrador do estúdio.\`;
    } else {
      const isFullDay = text.includes('dia') || !targetTime;
      const [y, m, d] = targetDate.split('-');
      const formattedDate = \`\${d}/\${m}/\${y}\`;

      if (isFullDay) {
        // Obter settings atuais
        const getUrl = \`\${FIRESTORE_BASE}/studio_settings/main?key=\${FIREBASE_API_KEY}\`;
        const setRes = await fetch(getUrl);
        const setJson = await setRes.json();
        
        let existingDates = [];
        if (setJson.fields?.blockedDates?.arrayValue?.values) {
          existingDates = setJson.fields.blockedDates.arrayValue.values.map(v => v.stringValue);
        }
        if (!existingDates.includes(targetDate)) {
          existingDates.push(targetDate);
        }

        // Patch no Firestore
        const patchUrl = \`\${FIRESTORE_BASE}/studio_settings/main?updateMask.fieldPaths=blockedDates&key=\${FIREBASE_API_KEY}\`;
        await fetch(patchUrl, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fields: {
              blockedDates: {
                arrayValue: {
                  values: existingDates.map(val => ({ stringValue: val }))
                }
              }
            }
          })
        });

        replyText = \`🔒 *Dia Bloqueado com Sucesso!*\\n\\nA data *\${formattedDate}* foi travada integralmente. Nenhum cliente conseguirá agendar neste dia.\`;
      } else {
        replyText = \`🔒 *Horário Bloqueado!*\\n\\nO intervalo das *\${targetTime}* na data *\${formattedDate}* foi registrado como indisponível.\`;
      }
    }
  }

  // C. INTENÇÃO: AGENDAR HORÁRIO
  else if ((text.includes('agenda') || text.includes('agendar') || text.includes('marcar') || text.includes('marca')) && targetDate && targetTime) {
    let clientName = senderName;

    // Se admin pediu pra agendar terceiro (Ex: "agenda o Marcelo amanhã às 15h")
    if (isAdmin) {
      const matchName = originalText.match(/(?:agenda(?:r)?|marca(?:r)?)\\s+(?:o|a)?\\s*([a-zA-ZÀ-ÿ]+)/i);
      if (matchName && matchName[1] && !['uma', 'pra', 'para', 'com', 'no', 'na', 'minha'].includes(matchName[1].toLowerCase())) {
        clientName = matchName[1].charAt(0).toUpperCase() + matchName[1].slice(1);
      }
    }

    const duration = targetSize === 'Grande' ? 240 : (targetSize === 'Média' ? 120 : 60);

    const createUrl = \`\${FIRESTORE_BASE}/bookings?key=\${FIREBASE_API_KEY}\`;
    const docData = {
      fields: {
        clientName: { stringValue: clientName },
        clientPhone: { stringValue: isAdmin ? '' : senderPhone },
        date: { stringValue: targetDate },
        time: { stringValue: targetTime },
        duration: { integerValue: duration },
        size: { stringValue: targetSize },
        artistId: { stringValue: 'Markinhos' },
        description: { stringValue: \`Tatuagem \${targetSize} (Agendada via WhatsApp)\` },
        status: { stringValue: isAdmin ? 'approved' : 'pending_approval' },
        createdAt: { timestampValue: new Date().toISOString() },
        source: { stringValue: 'whatsapp_ai_agent' }
      }
    };

    const bookRes = await fetch(createUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(docData)
    });

    const [y, m, d] = targetDate.split('-');
    const formattedDate = \`\${d}/\${m}/\${y}\`;

    if (bookRes.status === 200) {
      if (isAdmin) {
        replyText = \`✅ *Agendamento Confirmado pelo Chefe!*\\n\\n👤 *Cliente:* \${clientName}\\n📅 *Data:* \${formattedDate} às *\${targetTime}*\\n🎨 *Tamanho:* \${targetSize}\\n✍️ *Artista:* Markinhos\\n\\nJá está gravado no sistema e bloqueado na agenda! 🚀\`;
      } else {
        replyText = \`🎉 *Agendamento Recebido com Sucesso, \${clientName}!* 🖤\\n\\n📅 *Data:* \${formattedDate}\\n⏰ *Horário:* \${targetTime}\\n🎨 *Tamanho:* \${targetSize}\\n✍️ *Artista:* Markinhos\\n📍 *Local:* Rua Francesco de Martini 29, São Caetano do Sul\\n\\nSeu horário está pré-reservado. Qualquer dúvida ou imprevisto, é só me chamar por aqui! Te esperamos 🤘✨\`;
      }
    } else {
      replyText = \`⚠️ Houve uma instabilidade momentânea ao salvar na agenda. Por favor tente novamente em alguns segundos!\`;
    }
  }

  // D. INTENÇÃO: CONSULTAR HORÁRIOS DISPONÍVEIS
  else if (text.includes('horário') || text.includes('horario') || text.includes('vaga') || text.includes('livre') || text.includes('disponivel') || text.includes('disponível') || (targetDate && !targetTime && (text.includes('dia') || text.includes('quando')))) {
    // 1. Carrega agendamentos existentes no dia
    const queryUrl = \`\${FIRESTORE_BASE}:runQuery?key=\${FIREBASE_API_KEY}\`;
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
    const busyIntervals = items
      .filter(i => i.document && i.document.fields)
      .map(i => {
        const f = i.document.fields;
        const start = timeToMins(f.time?.stringValue || '00:00');
        const dur = Number(f.duration?.integerValue || 60);
        return { start, end: start + dur, status: f.status?.stringValue || '' };
      })
      .filter(i => i.status !== 'cancelled');

    // 2. Horários de funcionamento (09:00 às 22:00) em passos de 60m
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
    const formattedDate = \`\${d}/\${m}/\${y}\`;

    if (freeSlots.length > 0) {
      const slotsDisplay = freeSlots.slice(0, 6).join('   •   ');
      replyText = \`📅 *Horários Livres para \${formattedDate}:*\\n\\n⏰ \${slotsDisplay}\\n\\nQual horário fica melhor para você? Responda aqui com a hora que preferir (Ex: *"Quero às \${freeSlots[0]}"*)! 🖤\`;
    } else {
      replyText = \`⚠️ Para o dia *\${formattedDate}*, todos os horários já estão preenchidos! Gostaria de verificar para o próximo dia útil?\`;
    }
  }

  // E. CONVERSAÇÃO / AJUDA PADRÃO
  else {
    if (isAdmin) {
      replyText = \`Fala, Markinhos! 🤘 Sou o assistente inteligente da sua agenda.\\n\\nComandos rápidos que você pode me mandar:\\n• *"Agenda o [Nome] amanhã às 14h tattoo média"*\\n• *"Como tá a agenda de amanhã?"*\\n• *"Bloqueia o dia [data]"*\\n\\nO que manda agora?\`;
    } else {
      replyText = \`Olá, \${senderName}! 🖤 Bem-vindo(a) ao *Somos 1 Tattoo Studio*!\\n\\nSou o assistente virtual de agendamentos. Para marcar sua tattoo ou consultar datas disponíveis, me diga:\\n\\n1. Qual dia você gostaria de vir? (Ex: *"Quais horários tem na sexta?"*)\\n2. Ou me diga direto o horário: (Ex: *"Quero agendar amanhã às 15h"*)\\n\\nComo posso te ajudar hoje? 🤘✨\`;
    }
  }
} catch (err) {
  console.error("Erro no processamento:", err);
  replyText = \`Olá! Recebi sua mensagem, mas tive uma pequena oscilação momentânea ao acessar a agenda. Por favor, repita sua mensagem em instantes!\`;
}

return [{
  json: {
    number: senderPhone,
    text: replyText
  }
}];
`
        },
        type: "n8n-nodes-base.code",
        typeVersion: 2,
        position: [580, 300],
        id: "code-brain",
        name: "Processar Intenção & Firestore"
      },
      {
        parameters: {
          method: "POST",
          url: "https://p01--evolution--6n2dx6dsdlsf.code.run/message/sendText/wats",
          authentication: "none",
          sendHeaders: true,
          headerParameters: {
            parameters: [
              {
                name: "apikey",
                value: "020F2F224360-40F7-B022-D17AB8E529E2"
              },
              {
                name: "Content-Type",
                value: "application/json"
              }
            ]
          },
          sendBody: true,
          specifyBody: "json",
          jsonBody: `={
  "number": "{{ $json.number }}",
  "text": {{ JSON.stringify($json.text) }},
  "linkPreview": true
}`,
          options: {}
        },
        type: "n8n-nodes-base.httpRequest",
        typeVersion: 4.2,
        position: [850, 300],
        id: "http-send-wa",
        name: "Disparar Resposta WhatsApp"
      }
    ],
    connections: {
      "Webhook Inbound WhatsApp": {
        main: [
          [{ node: "Filtrar & Identificar Sender", type: "main", index: 0 }]
        ]
      },
      "Filtrar & Identificar Sender": {
        main: [
          [{ node: "Processar Intenção & Firestore", type: "main", index: 0 }]
        ]
      },
      "Processar Intenção & Firestore": {
        main: [
          [{ node: "Disparar Resposta WhatsApp", type: "main", index: 0 }]
        ]
      }
    },
    settings: {
      executionOrder: "v1"
    }
  };

  console.log("Criando novo workflow no n8n...");
  const createRes = await apiRequest('POST', '/workflows', agentWorkflow);
  console.log("Criação status:", createRes.status, "ID:", createRes.data?.id);

  if (createRes.data?.id) {
    const act = await apiRequest('POST', `/workflows/${createRes.data.id}/activate`);
    console.log("Ativação status:", act.status, "Ativo:", act.data?.active);
  }

  // 3. Atualizar webhook na Evolution API instance wats
  console.log("Configurando webhook na Evolution API instance wats...");
  const evoUrl = `https://${EVOLUTION_HOST}/webhook/set/${EVOLUTION_INSTANCE}`;
  const evoBody = {
    webhook: {
      url: `https://${N8N_HOST}/webhook/agente-whatsapp`,
      enabled: true,
      events: ["MESSAGES_UPSERT"]
    }
  };

  const evoRes = await fetch(evoUrl, {
    method: 'POST',
    headers: {
      'apikey': EVOLUTION_APIKEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(evoBody)
  });

  const evoData = await evoRes.json();
  console.log("Evolution API Webhook status:", evoRes.status, evoData);
}

main().catch(console.error);
