const https = require('https');

const N8N_HOST = 'www.marcos9vinci.dedyn.io';
const N8N_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzZjIwYWY2Yy05NDUwLTRiMmItYTI3Yy03NTk5YWRlMDBlZjIiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiOWI5ODYxYzUtY2I2NS00ZDY3LWI0ZDMtN2M3ODgyNGM1ZjIzIiwiaWF0IjoxNzkwNTY1OTc1fQ.OISZGxWw39DHfmJwQg9L0J3uPwXgtHgq7Z9mAwFoXeM';

const WORKFLOW_ID = 'AwdTM7zQobeUSPKO';

async function updateWorkflow() {
  console.log("=== ATUALIZANDO AGENTE ASSESSOR PESSOAL DO MARKINHOS NO N8N ===");

  const workflow = {
    name: "Somos 1 — Agente Assessor Pessoal (Markinhos Admin)",
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
// 1. FILTRAR E VALIDAR REMETENTE (APENAS MARKINHOS / ADMIN)
const body = $json.body || $json;

const event = body.event;
if (event && event !== 'messages.upsert') {
  return [];
}

const data = body.data || body;
const key = data.key || {};

// Ignora mensagens enviadas pelo próprio robô
if (key.fromMe) {
  return [];
}

const remoteJid = key.remoteJid || '';
// Ignora grupos e status
if (remoteJid.includes('@g.us') || remoteJid.includes('status@broadcast')) {
  return [];
}

const rawPhone = remoteJid.replace('@s.whatsapp.net', '').replace(/\\D/g, '');
const pushName = data.pushName || 'Markinhos';

// Extrai texto da mensagem
let userText = '';
const msg = data.message || {};
if (msg.conversation) {
  userText = msg.conversation;
} else if (msg.extendedTextMessage?.text) {
  userText = msg.extendedTextMessage.text;
} else if (msg.imageMessage?.caption) {
  userText = msg.imageMessage.caption;
} else if (msg.audioMessage) {
  userText = '[Áudio]';
}

if (!userText || userText.trim().length === 0) {
  return [];
}

// Telefones autorizados como Administrador (Markinhos)
const adminPhones = ['5511948116922', '5511957837132', '11948116922', '11957837132'];
const isAuthorizedAdmin = adminPhones.some(p => rawPhone.endsWith(p.replace(/^55/, '')));

// SE NÃO FOR O MARKINHOS: O robô NÃO responde clientes comuns!
if (!isAuthorizedAdmin) {
  return [];
}

return [{
  json: {
    adminPhone: rawPhone.startsWith('55') ? rawPhone : '55' + rawPhone,
    adminName: pushName,
    text: userText.trim(),
    receivedAt: new Date().toISOString()
  }
}];
`
        },
        type: "n8n-nodes-base.code",
        typeVersion: 2,
        position: [340, 300],
        id: "code-filter",
        name: "Validar Markinhos Admin"
      },
      {
        parameters: {
          jsCode: `
// 2. PROCESSADOR DO ASSESSOR (CRIAÇÃO DE AGENDAMENTOS E CONSULTAS)
const input = $input.first().json;
const text = input.text;
const tLower = text.toLowerCase();
const adminPhone = input.adminPhone;

const FIREBASE_API_KEY = "AIzaSyAhIXcG4ReuncxNBZSqjXYOu7Exka_TNo0";
const FIRESTORE_BASE = "https://firestore.googleapis.com/v1/projects/memorizeai-7b8fd/databases/ai-studio-dcd3cc7e-f58b-453b-a948-88e194766ac9/documents";
const EVOLUTION_URL = "https://p01--evolution--6n2dx6dsdlsf.code.run/message/sendText/wats";
const EVOLUTION_KEY = "020F2F224360-40F7-B022-D17AB8E529E2";
const N8N_REMINDER_URL = "https://www.marcos9vinci.dedyn.io/webhook/indica-automacao";

// Funções Auxiliares de Parsing
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
    const tm = new Date(Date.now() + 86400000);
    return tm.toISOString().split('T')[0];
  }
  const days = { 'domingo': 0, 'segunda': 1, 'terça': 2, 'terca': 2, 'quarta': 3, 'quinta': 4, 'sexta': 5, 'sábado': 6, 'sabado': 6 };
  for (const [dayName, dayIdx] of Object.entries(days)) {
    if (t.includes(dayName)) {
      const currentDay = now.getDay();
      let diff = dayIdx - currentDay;
      if (diff <= 0) diff += 7;
      const target = new Date(Date.now() + diff * 86400000);
      return target.toISOString().split('T')[0];
    }
  }
  return null;
}

function parseTime(t) {
  const match = t.match(/(?:às|as|horario|hora|horário)?\\s*:?\\s*(\\d{1,2}(?::\\d{2}|h\\d{0,2}))/i) || t.match(/\\b(\\d{1,2}:\\d{2})\\b/);
  if (!match) return null;
  let raw = match[1].toLowerCase().replace('h', ':');
  if (!raw.includes(':')) raw += ':00';
  const [h, m] = raw.split(':');
  const hNum = Number(h);
  if (hNum < 0 || hNum > 23) return null;
  return \`\${String(hNum).padStart(2, '0')}:\${m ? String(m).padStart(2, '0') : '00'}\`;
}

function parsePhone(t) {
  const match = t.match(/(?:contato|tel|cel|whatsapp|zap|fone)?\\s*:?\\s*(\\b(?:55)?(?:\\(?\\d{2}\\)?\\s*)?(?:9\\d{4}[-\\s]?\\d{4}|[1-8]\\d{3}[-\\s]?\\d{4})\\b)/i);
  if (!match) return null;
  let cleaned = match[1].replace(/\\D/g, '');
  if (cleaned.length === 10 || cleaned.length === 11) {
    cleaned = '55' + cleaned;
  }
  return cleaned;
}

function parseName(t) {
  const matchLabeled = t.match(/(?:nome|cliente)\\s*:?\\s*([^\\n,]+)/i);
  if (matchLabeled) return matchLabeled[1].trim();

  const matchVerb = t.match(/(?:agenda(?:r)?|marca(?:r)?)\\s+(?:o|a)?\\s*([A-Za-zÀ-ÿ\\s]+?)(?:,|$|\\s+contato|\\s+tel|\\s+telefone|\\s+dia|\\s+para|\\s+pra|\\s+às|\\s+as)/i);
  if (matchVerb && matchVerb[1]) {
    const candidate = matchVerb[1].trim();
    if (!['uma', 'pra', 'para', 'com', 'no', 'na', 'minha', 'tattoo', 'tatuagem'].includes(candidate.toLowerCase())) {
      return candidate;
    }
  }
  return null;
}

function parseDescription(t) {
  const match = t.match(/(?:desenho|tattoo|arte|ideia|tatuagem)\\s*:?\\s*([^\\n,]+)/i);
  if (match) return match[1].trim();
  return "Tatuagem Personalizada";
}

function parseSize(t) {
  if (t.includes('grande') || t.includes('fechamento')) return 'Grande';
  if (t.includes('pequena') || t.includes('delicada') || t.includes('escrita')) return 'Pequena';
  return 'Média';
}

let replyText = '';

try {
  // A. COMANDO: CONSULTAR AGENDA (Ex: "Como tá a agenda de amanhã?")
  if (tLower.includes('como tá a agenda') || tLower.includes('como esta a agenda') || tLower.includes('agenda de') || (tLower.includes('agenda') && (tLower.includes('hoje') || tLower.includes('amanha') || tLower.includes('amanhã')))) {
    const targetDate = parseDate(tLower) || new Date().toISOString().split('T')[0];
    const [y, m, d] = targetDate.split('-');
    const formattedDate = \`\${d}/\${m}/\${y}\`;

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
    const active = (Array.isArray(items) ? items : [])
      .filter(i => i.document && i.document.fields)
      .map(i => {
        const f = i.document.fields;
        return {
          client: f.userName?.stringValue || f.clientName?.stringValue || 'Cliente',
          time: f.time?.stringValue || '00:00',
          size: f.size?.stringValue || 'Média',
          desc: f.descricao_servico?.stringValue || 'Tattoo',
          status: f.status?.stringValue || 'approved'
        };
      })
      .filter(b => b.status !== 'cancelled' && b.status !== 'rejected');

    if (active.length === 0) {
      replyText = \`📅 *Agenda para \${formattedDate}:*\\n\\nNenhum agendamento confirmado para este dia. A agenda está livre! ✨\`;
    } else {
      const list = active.map((b, idx) => \`\${idx + 1}. ⏰ *\${b.time}* - \${b.client} (\${b.desc})\`).join('\\n');
      replyText = \`📅 *Agenda Somos 1 Tattoo (\${formattedDate}):*\\n\\n\${list}\\n\\nTotal: *\${active.length} cliente(s)* marcados. 🤘\`;
    }
  }

  // B. COMANDO: BLOQUEAR DATA (Ex: "Bloqueia sexta")
  else if (tLower.includes('bloquear') || tLower.includes('bloqueia') || tLower.includes('trava')) {
    const targetDate = parseDate(tLower);
    if (!targetDate) {
      replyText = "⚠️ Chefe, qual data você gostaria de bloquear? Me diga o dia (Ex: *'Bloqueia 05/10'* ou *'Bloqueia sexta'*).";
    } else {
      const [y, m, d] = targetDate.split('-');
      const formattedDate = \`\${d}/\${m}/\${y}\`;

      // Atualiza Firestore studio_settings/main
      const getUrl = \`\${FIRESTORE_BASE}/studio_settings/main?key=\${FIREBASE_API_KEY}\`;
      const setRes = await fetch(getUrl);
      const setJson = await setRes.json();
      let existingDates = [];
      if (setJson.fields?.blockedDates?.arrayValue?.values) {
        existingDates = setJson.fields.blockedDates.arrayValue.values.map(v => v.stringValue);
      }
      if (!existingDates.includes(targetDate)) {
        existingDates.push(targetDate);
        const patchUrl = \`\${FIRESTORE_BASE}/studio_settings/main?updateMask.fieldPaths=blockedDates&key=\${FIREBASE_API_KEY}\`;
        await fetch(patchUrl, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fields: {
              blockedDates: {
                arrayValue: { values: existingDates.map(val => ({ stringValue: val })) }
              }
            }
          })
        });
      }
      replyText = \`🔒 *Dia Bloqueado com Sucesso, Chefe!*\n\nA data *\${formattedDate}* foi travada. Nenhum cliente conseguirá agendar neste dia pelo app.\`;
    }
  }

  // C. COMANDO PRINCIPAL: AGENDAR CLIENTE
  // (Ex: Nome, Contato, Horario, Dia e Desenho)
  else {
    const clientName = parseName(text);
    const clientPhone = parsePhone(text);
    const targetDate = parseDate(tLower);
    const targetTime = parseTime(text);
    const description = parseDescription(text);
    const size = parseSize(tLower);

    const missing = [];
    if (!clientName) missing.push("• *Nome do cliente*");
    if (!clientPhone) missing.push("• *Contato / WhatsApp do cliente*");
    if (!targetDate) missing.push("• *Dia da sessão* (Ex: amanhã ou 05/10)");
    if (!targetTime) missing.push("• *Horário da sessão* (Ex: 14h ou 15:30)");

    if (missing.length > 0) {
      replyText = \`⚠️ *Chefe, para eu agendar faltou:*\n\n\${missing.join('\\n')}\n\n👉 Pode mandar tudo em uma mensagem só, por exemplo:\n*"Agenda o Lucas, contato 11988887777, amanhã às 14h, desenho: dragão no braço"* 👊\`;
    } else {
      const [y, m, d] = targetDate.split('-');
      const formattedDate = \`\${d}/\${m}/\${y}\`;
      const duration = size === 'Grande' ? 240 : (size === 'Média' ? 120 : 60);

      // 1. Grava no Firestore bookings
      const createUrl = \`\${FIRESTORE_BASE}/bookings?key=\${FIREBASE_API_KEY}\`;
      const docData = {
        fields: {
          userName: { stringValue: clientName },
          userPhone: { stringValue: clientPhone },
          date: { stringValue: targetDate },
          time: { stringValue: targetTime },
          descricao_servico: { stringValue: \`Tatuagem (\${size}) - \${description}\` },
          size: { stringValue: size },
          duration: { integerValue: String(duration) },
          status: { stringValue: 'approved' },
          artistId: { stringValue: 'Markinhos' },
          priceEstimated: { integerValue: '0' },
          depositPaid: { integerValue: '0' },
          creditsUsed: { integerValue: '0' },
          confirmationSent: { booleanValue: true },
          confirmationSentAt: { timestampValue: new Date().toISOString() },
          createdAt: { timestampValue: new Date().toISOString() },
          source: { stringValue: 'whatsapp_admin_assessor' }
        }
      };

      const bookRes = await fetch(createUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(docData)
      });
      const bookJson = await bookRes.json();
      const bookingId = bookJson.name ? bookJson.name.split('/').pop() : 'novo';

      // 2. Dispara confirmação no WhatsApp do CLIENTE via Evolution API
      const clientMsg = \`✅ Olá, *\${clientName}*! Seu agendamento no *Somos 1 Tattoo Studio* foi confirmado pelo Markinhos! 🖤\\n\\n📅 *Data:* \${formattedDate}\\n⏰ *Horário:* \${targetTime}\\n🎨 *Arte:* \${description}\\n✍️ *Artista:* Markinhos\\n📍 *Local:* Rua Francesco de Martini 29, São Caetano do Sul\\n\\nTe esperamos! Qualquer dúvida, estamos à disposição. 🤘✨\`;

      await fetch(EVOLUTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': EVOLUTION_KEY
        },
        body: JSON.stringify({
          number: clientPhone,
          text: clientMsg,
          linkPreview: true
        })
      });

      // 3. Dispara campainha do n8n para agendar Lembretes e Follow-up automáticos
      await fetch(N8N_REMINDER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'confirmacao',
          phone: clientPhone,
          booking_date: targetDate,
          booking_time: targetTime,
          message: clientMsg
        })
      });

      // 4. Responde para o Markinhos confirmando tudo
      replyText = \`✅ *Agendamento Realizado com Sucesso, Chefe!* 🤘\\n\\n👤 *Cliente:* \${clientName}\\n📱 *WhatsApp:* \${clientPhone}\\n📅 *Data:* \${formattedDate} às *\${targetTime}*\\n🎨 *Tattoo:* \${description} (\${size})\\n✍️ *Artista:* Markinhos\\n\\n🚀 Já salvei na agenda do app, disparei a confirmação para o cliente no WhatsApp e ativei os lembretes automáticos! 👊\`;
    }
  }
} catch (err) {
  console.error("Erro assessor:", err);
  replyText = "⚠️ Chefe, ocorreu um erro ao gravar o agendamento: " + (err.message || String(err));
}

return [{
  json: {
    number: adminPhone,
    text: replyText
  }
}];
`
        },
        type: "n8n-nodes-base.code",
        typeVersion: 2,
        position: [560, 300],
        id: "code-assessor",
        name: "Processar Assessor Admin"
      },
      {
        parameters: {
          method: "POST",
          url: "https://p01--evolution--6n2dx6dsdlsf.code.run/message/sendText/wats",
          sendHeaders: true,
          headerParameters: {
            parameters: [
              { name: "apikey", value: "020F2F224360-40F7-B022-D17AB8E529E2" },
              { name: "Content-Type", value: "application/json" }
            ]
          },
          sendBody: true,
          specifyBody: "json",
          jsonBody: "={\n  \"number\": \"{{ $json.number }}\",\n  \"text\": {{ JSON.stringify($json.text) }},\n  \"linkPreview\": true\n}",
          options: {}
        },
        type: "n8n-nodes-base.httpRequest",
        typeVersion: 4.2,
        position: [820, 300],
        id: "http-reply-admin",
        name: "Responder Markinhos WhatsApp"
      }
    ],
    connections: {
      "Webhook Inbound WhatsApp": {
        main: [[{ node: "Validar Markinhos Admin", type: "main", index: 0 }]]
      },
      "Validar Markinhos Admin": {
        main: [[{ node: "Processar Assessor Admin", type: "main", index: 0 }]]
      },
      "Processar Assessor Admin": {
        main: [[{ node: "Responder Markinhos WhatsApp", type: "main", index: 0 }]]
      }
    },
    settings: { executionOrder: "v1" }
  };

  const putReq = https.request({
    hostname: N8N_HOST,
    port: 443,
    path: `/api/v1/workflows/${WORKFLOW_ID}`,
    method: 'PUT',
    headers: {
      'X-N8N-API-KEY': N8N_TOKEN,
      'Content-Type': 'application/json'
    }
  }, (res) => {
    let body = '';
    res.on('data', d => body += d);
    res.on('end', async () => {
      console.log(`Status atualização workflow: ${res.statusCode}`);
      if (res.statusCode === 200) {
        console.log("✅ Workflow do Assessor atualizado com sucesso!");
        
        // Ativar workflow
        const actReq = https.request({
          hostname: N8N_HOST,
          port: 443,
          path: `/api/v1/workflows/${WORKFLOW_ID}/activate`,
          method: 'POST',
          headers: { 'X-N8N-API-KEY': N8N_TOKEN }
        }, (resAct) => {
          console.log(`Status ativação: ${resAct.statusCode}`);
          console.log("🚀 AGENTE ASSESSOR ATIVO E PRONTO NO WHATSAPP!");
        });
        actReq.end();
      } else {
        console.error("Falha ao atualizar:", body);
      }
    });
  });

  putReq.on('error', console.error);
  putReq.write(JSON.stringify(workflow));
  putReq.end();
}

updateWorkflow();
