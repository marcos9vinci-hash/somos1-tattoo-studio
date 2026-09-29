const https = require('https');

const N8N_HOST = 'www.marcos9vinci.dedyn.io';
const N8N_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzZjIwYWY2Yy05NDUwLTRiMmItYTI3Yy03NTk5YWRlMDBlZjIiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiOWI5ODYxYzUtY2I2NS00ZDY3LWI0ZDMtN2M3ODgyNGM1ZjIzIiwiaWF0IjoxNzkwNTY1OTc1fQ.OISZGxWw39DHfmJwQg9L0J3uPwXgtHgq7Z9mAwFoXeM';

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
  console.log("=== CONFIGURANDO AGENTE WHATSAPP NO N8N ===");

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
// 1. FILTRAR E NORMALIZAR MENSAGEM RECEBIDA
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
  userText = '[Áudio recebido]';
}

if (!userText || userText.trim().length === 0) {
  return [];
}

// Identifica se é o administrador
const adminPhones = ['5511948116922', '5511957837132'];
const isAdmin = adminPhones.includes(rawPhone);

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
// 2. CÉREBRO DO AGENTE (INTELIGÊNCIA HÍBRIDA ADMIN + CLIENTE)
const input = $input.first().json;
const text = input.text.toLowerCase();
const originalText = input.text;
const phone = input.phone;
const name = input.name;
const isAdmin = input.isAdmin;

// Helper: Extração de Data
function parseDate(t) {
  const now = new Date();
  // Se contiver DD/MM/AAAA ou DD/MM
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
  // Dias da semana
  const days = { 'domingo': 0, 'segunda': 1, 'terça': 2, 'terca': 2, 'quarta': 3, 'quinta': 4, 'sexta': 5, 'sábado': 6, 'sabado': 6 };
  for (const [dayName, dayIdx] of Object.entries(days)) {
    if (t.includes(dayName)) {
      const currentDay = now.getDay();
      let diff = dayIdx - currentDay;
      if (diff <= 0) diff += 7; // Próximo dia correspondente
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

const targetDate = parseDate(text);
const targetTime = parseTime(text);
const targetSize = parseSize(text);

let intent = 'CONVERSATION';
if (text.includes('agenda de') || text.includes('como tá a agenda') || text.includes('como esta a agenda') || (text.includes('agenda') && (text.includes('hoje') || text.includes('amanha')))) {
  intent = 'SUMMARY';
} else if (text.includes('bloquear') || text.includes('bloqueia') || text.includes('trava o dia') || text.includes('travar')) {
  intent = 'BLOCK';
} else if ((text.includes('agenda') || text.includes('agendar') || text.includes('marcar') || text.includes('marca')) && targetDate && targetTime) {
  intent = 'BOOK';
} else if (text.includes('horário') || text.includes('horario') || text.includes('vaga') || text.includes('disponivel') || text.includes('disponível') || (targetDate && !targetTime)) {
  intent = 'CHECK_SLOTS';
}

return [{
  json: {
    ...input,
    intent,
    targetDate: targetDate || new Date().toISOString().split('T')[0],
    targetTime,
    targetSize
  }
}];
`
        },
        type: "n8n-nodes-base.code",
        typeVersion: 2,
        position: [580, 300],
        id: "code-nlp",
        name: "Classificar Intenção & Parâmetros"
      },
      {
        parameters: {
          jsCode: `
// 3. EXECUÇÃO DE FERRAMENTAS & REPOSTA AO USUÁRIO
const item = $input.first().json;
const intent = item.intent;
const isAdmin = item.isAdmin;
const senderPhone = item.phone;
const senderName = item.name;
const text = item.text;
const date = item.targetDate;
const time = item.targetTime;
const size = item.targetSize;

const baseUrl = 'https://somos1-tattoo-studio.vercel.app';

let replyText = '';

try {
  // A. INTENÇÃO: RESUMO DA AGENDA (ADMIN)
  if (intent === 'SUMMARY') {
    const res = await fetch(\`\${baseUrl}/api/agent/summary?date=\${date}\`);
    const data = await res.json();
    replyText = data.summaryText || 'Nenhum agendamento encontrado para esta data.';
  }

  // B. INTENÇÃO: BLOQUEAR HORÁRIO / DIA (ADMIN)
  else if (intent === 'BLOCK' && isAdmin) {
    const isFullDay = text.includes('dia') || !time;
    const blockRes = await fetch(\`\${baseUrl}/api/agent/block\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: date,
        start: time || '09:00',
        end: '19:00',
        label: 'Bloqueio via WhatsApp (Comando Admin)',
        fullDay: isFullDay
      })
    });
    const blockData = await blockRes.json();
    replyText = \`🔒 *Bloqueio Efetuado!*\\n\${blockData.message || 'Horário travado com sucesso na agenda.'}\`;
  }

  // C. INTENÇÃO: AGENDAR DIRETAMENTE
  else if (intent === 'BOOK') {
    let clientName = senderName;

    // Se for o admin agendando para terceiros (Ex: "agenda o Lucas amanhã...")
    if (isAdmin) {
      const matchName = text.match(/(?:agenda(?:r)?|marca(?:r)?)\\s+(?:o|a)?\\s*([a-zA-ZÀ-ÿ]+)/i);
      if (matchName && matchName[1] && !['uma', 'pra', 'para', 'com', 'no', 'na'].includes(matchName[1].toLowerCase())) {
        clientName = matchName[1].charAt(0).toUpperCase() + matchName[1].slice(1);
      }
    }

    const bookRes = await fetch(\`\${baseUrl}/api/agent/book\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientName: clientName,
        clientPhone: isAdmin ? '' : senderPhone,
        date: date,
        time: time,
        size: size,
        artistId: 'Markinhos',
        description: \`Tatuagem \${size}\`,
        createdByAdmin: isAdmin,
        status: 'approved'
      })
    });

    const bookData = await bookRes.json();

    if (bookData.success) {
      const [y, m, d] = date.split('-');
      const formattedDate = \`\${d}/\${m}/\${y}\`;

      if (isAdmin) {
        replyText = \`✅ *Agendamento Confirmado pelo Admin!*\\n\\n👤 *Cliente:* \${clientName}\\n📅 *Data:* \${formattedDate} às \${time}\\n🎨 *Tamanho:* \${size}\\n✍️ *Artista:* Markinhos\\n\\nJá está registrado na agenda do sistema! 🚀\`;
      } else {
        replyText = \`🎉 *Tudo Pronto, \${clientName}!*\\n\\nSeu horário está *CONFIRMADO* no Somos 1 Tattoo Studio! 🖤\\n\\n📅 *Data:* \${formattedDate}\\n⏰ *Horário:* \${time}\\n🎨 *Tamanho:* \${size}\\n✍️ *Artista:* Markinhos\\n📍 *Local:* Somos 1 Tattoo Studio\\n\\n💡 Qualquer imprevisto, só responder aqui. Te esperamos! 🤘✨\`;
      }
    } else {
      replyText = \`⚠️ Não consegui concluir o agendamento: \${bookData.message || 'Horário indisponível'}.\`;
    }
  }

  // D. INTENÇÃO: CONSULTAR HORÁRIOS DISPONÍVEIS
  else if (intent === 'CHECK_SLOTS') {
    const slotsRes = await fetch(\`\${baseUrl}/api/agent/slots?date=\${date}&size=\${size}\`);
    const slotsData = await slotsRes.json();

    const [y, m, d] = date.split('-');
    const formattedDate = \`\${d}/\${m}/\${y}\`;

    if (slotsData.available && slotsData.freeSlots?.length > 0) {
      const topSlots = slotsData.freeSlots.slice(0, 6).join('  •  ');
      replyText = \`📅 *Horários Disponíveis para \${slotsData.dayOfWeek || ''} (\${formattedDate}):*\\n\\n⏰ \${topSlots}\\n\\nQual desses horários você prefere agendar? Só me responder com a hora desejada (Ex: "Quero às \${slotsData.freeSlots[0]}")! 🖤\`;
    } else {
      replyText = \`⚠️ Para o dia *\${formattedDate}*, o estúdio não tem horários livres disponíveis (\${slotsData.reason || 'agenda completa'}).\\n\\nGostaria de verificar para o dia seguinte?\`;
    }
  }

  // E. CONVERSAÇÃO PADRÃO / BOAS-VINDAS
  else {
    if (isAdmin) {
      replyText = \`Olá, chefe! 🤘 Sou o assistente da agenda do *Somos 1 Tattoo Studio*.\\n\\nVocê pode me pedir:\\n• *"Agenda o [Nome] [data] às [horário]"*\\n• *"Como tá a agenda de hoje / amanhã?"*\\n• *"Bloqueia o dia [data]"*\\n\\nO que deseja fazer agora?\`;
    } else {
      replyText = \`Olá, \${senderName}! 🖤 Tudo bem? Bem-vindo(a) ao *Somos 1 Tattoo Studio*!\\n\\nSou o assistente virtual de agendamentos. Para marcar seu horário ou tirar dúvidas, você pode:\\n\\n1. Me dizer qual dia você gostaria de tatuar (Ex: *"Quais horários tem na sexta?"*)\\n2. Dizer o horário desejado (Ex: *"Quero agendar amanhã às 15h"*)\\n\\nComo posso te ajudar hoje? 🤘✨\`;
    }
  }
} catch (err) {
  console.error("Erro no processamento do agente:", err);
  replyText = \`Olá! Recebi sua mensagem, mas tive uma oscilação momentânea ao consultar a agenda. Por favor, tente novamente em instantes!\`;
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
        position: [800, 300],
        id: "code-executor",
        name: "Executar Agente & Gerar Resposta"
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
        position: [1020, 300],
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
          [{ node: "Classificar Intenção & Parâmetros", type: "main", index: 0 }]
        ]
      },
      "Classificar Intenção & Parâmetros": {
        main: [
          [{ node: "Executar Agente & Gerar Resposta", type: "main", index: 0 }]
        ]
      },
      "Executar Agente & Gerar Resposta": {
        main: [
          [{ node: "Disparar Resposta WhatsApp", type: "main", index: 0 }]
        ]
      }
    },
    settings: {
      executionOrder: "v1"
    }
  };

  console.log("Criando workflow do Agente WhatsApp no n8n...");
  const res = await apiRequest('POST', '/workflows', agentWorkflow);
  console.log("Criação status:", res.status, "ID:", res.data?.id);

  if (res.data?.id) {
    const act = await apiRequest('POST', `/workflows/${res.data.id}/activate`);
    console.log("Ativação status:", act.status, "Ativo:", act.data?.active);
  }
}

main().catch(console.error);
