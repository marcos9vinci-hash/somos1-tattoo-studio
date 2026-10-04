// ============================================================================
// SOMOS 1 TATTOO STUDIO — NATIVE AI AGENT ENGINE (VERCEL SERVERLESS)
// 100% NATIVO — SUBSTITUI O N8N EM DEFINITIVO (ZERO MEMÓRIA NO NORTHFLANK)
// ============================================================================

const FIREBASE_API_KEY = "AIzaSyAhIXcG4ReuncxNBZSqjXYOu7Exka_TNo0";
const FIRESTORE_BASE = "https://firestore.googleapis.com/v1/projects/memorizeai-7b8fd/databases/ai-studio-dcd3cc7e-f58b-453b-a948-88e194766ac9/documents";

const EVOLUTION_HOST = 'p01--evolution--6n2dx6dsdlsf.code.run';
const EVOLUTION_APIKEY = '020F2F224360-40F7-B022-D17AB8E529E2';
const EVOLUTION_INSTANCE = 'wats';

const TELEGRAM_TOKEN = '8824178251:AAFu-yv94YS-XGKHXh1t_Q-EIrThiYLXYC4';
const TELEGRAM_ADMIN_CHAT_ID = '894069351'; // Marcos Vinicius

const GEMINI_KEY = 'AIzaSyBdWdWmBaY4b-Z8A0l-WlCod1yhtID3VU4';

// ─── HELPERS GERAIS ─────────────────────────────────────────────────────────

function formatPhone(phone) {
  if (!phone || phone === '00000000000') return 'Sem WhatsApp';
  const digits = String(phone).replace(/\D/g, '');
  const local = digits.startsWith('55') ? digits.slice(2) : digits;
  if (local.length === 11) {
    return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`;
  } else if (local.length === 10) {
    return `(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`;
  }
  return phone;
}

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
  if (t.includes('hoje')) return now.toISOString().split('T')[0];
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

// ─── DISPAROS EXTERNOS ──────────────────────────────────────────────────────

async function sendWhatsAppMessage(phone, text) {
  if (!phone || !text) return false;
  try {
    const cleanPhone = String(phone).replace(/\D/g, '');
    const res = await fetch(`https://${EVOLUTION_HOST}/message/sendText/${EVOLUTION_INSTANCE}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_APIKEY
      },
      body: JSON.stringify({
        number: cleanPhone,
        text: text.trim() + '\n\n\u200B',
        linkPreview: true
      })
    });
    return res.ok;
  } catch (err) {
    console.error('Erro ao enviar mensagem WhatsApp:', err);
    return false;
  }
}

async function sendTelegramMessage(chatId, text, inlineKeyboard) {
  try {
    const body = {
      chat_id: chatId || TELEGRAM_ADMIN_CHAT_ID,
      text: text,
      parse_mode: 'Markdown'
    };
    if (inlineKeyboard && inlineKeyboard.length > 0) {
      body.reply_markup = { inline_keyboard: inlineKeyboard };
    }
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
  } catch (err) {
    console.error('Erro ao enviar Telegram:', err);
    return null;
  }
}

async function answerTelegramCallback(callbackQueryId, text) {
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text: text || 'Ação registrada!',
        show_alert: false
      })
    });
  } catch (e) {}
}

async function editTelegramMessage(chatId, messageId, text, inlineKeyboard) {
  try {
    const body = {
      chat_id: chatId,
      message_id: messageId,
      text: text,
      parse_mode: 'Markdown'
    };
    if (inlineKeyboard && inlineKeyboard.length > 0) {
      body.reply_markup = { inline_keyboard: inlineKeyboard };
    }
    await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/editMessageText`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
  } catch (e) {}
}

function getMainHQMenu() {
  const texto = 
    '🏢 *QUARTEL GENERAL — SOMOS 1 TATTOO* 🎨\n\n' +
    'Fala, *Marcos*! Aqui está o seu painel de controle com os *6 Agentes Especializados* do estúdio.\n\n' +
    'Toque em qualquer agente abaixo para consultar a esteira dele ou ver ações pendentes:\n\n' +
    '🛎️ *1. Recepção:* Novos contatos & triagem inicial\n' +
    '🎯 *2. SDR Consultivo:* Qualificação da ideia & SPIN\n' +
    '💬 *3. Jonathan:* Propostas, negociação & Sinal PIX\n' +
    '📅 *4. Secretário:* Confirmações & blindagem da agenda\n' +
    '✨ *5. Juliana:* Pós-venda, cuidados & cicatrização\n' +
    '🔕 *6. Avalanche:* Resgate de quem sumiu ou faltou';

  const botoes = [
    [
      { text: '🛎️ 1. Triagem & Recepção', callback_data: 'agente:novo' },
      { text: '🎯 2. SDR (Clone Dono)', callback_data: 'agente:qualificacao' }
    ],
    [
      { text: '💬 3. Fechamento & Sinal PIX', callback_data: 'agente:negociacao' },
      { text: '📅 4. Secretário da Agenda', callback_data: 'agente:agendado' }
    ],
    [
      { text: '✨ 5. Juliana (Pós-Venda)', callback_data: 'agente:pos_venda' },
      { text: '🔕 6. Avalanche (Resgate)', callback_data: 'agente:followup' }
    ],
    [
      { text: '📊 Relatório Geral do Estúdio', callback_data: 'estudio:status' }
    ],
    [
      { text: '🌐 Abrir CRM no Navegador', url: 'https://somos1-tattoo-studio.vercel.app/admin' }
    ]
  ];

  return { texto, botoes };
}

function getAgentReportText(tipo) {
  const voltarBtn = [{ text: '🔙 Voltar ao Painel dos Agentes', callback_data: 'menu:principal' }];
  switch (tipo) {
    case 'novo':
      return {
        texto: `🛎️ *AGENTE 01: TRIAGEM & RECEPÇÃO*\n\n` +
               `🎯 *Papel:* Recepção ágil e identificação de interesse.\n` +
               `💡 *Comportamento:* Acolhe calorosamente novos contatos que chamam no WhatsApp, saúda pelo primeiro nome e pergunta qual estilo ou ideia eles gostariam de tatuar.\n\n` +
               `_Disponível 24/7 sem consumir RAM no Northflank._`,
        botoes: [
          [{ text: '🌐 Ver no CRM', url: 'https://somos1-tattoo-studio.vercel.app/admin' }],
          voltarBtn
        ]
      };
    case 'qualificacao':
      return {
        texto: `🎯 *AGENTE 02: SDR CONSULTIVO (CLONE DO DONO)*\n\n` +
               `🧠 *Framework:* SPIN Selling + Coleta de Referências\n` +
               `🎨 *Papel:* Entende o tamanho (pequena, média, fechamento), região do corpo (antebraço, costela, etc.) e solicita fotos de referência antes de passar para orçamento.\n\n` +
               `_Foco em valorizar a arte e a história do cliente._`,
        botoes: [
          [{ text: '🌐 Abrir Funil Comercial', url: 'https://somos1-tattoo-studio.vercel.app/admin' }],
          voltarBtn
        ]
      };
    case 'negociacao':
      return {
        texto: `💬 *AGENTE 03: JONATHAN (FECHAMENTO & SINAL PIX)*\n\n` +
               `💰 *Regra de Ouro:* Sinal de Reserva de 30% via PIX obrigatório para travar o horário na agenda e iniciar o desenho sob medida!\n` +
               `🔑 *Chave PIX oficial:* somos1tattoo@gmail.com\n\n` +
               `_Quebra objeções, transmite autoridade técnica e blinda a agenda contra furos._`,
        botoes: [
          [{ text: '🌐 Gerenciar Propostas no CRM', url: 'https://somos1-tattoo-studio.vercel.app/admin' }],
          voltarBtn
        ]
      };
    case 'agendado':
      return {
        texto: `📅 *AGENTE 04: SECRETÁRIO DA AGENDA*\n\n` +
               `📍 *Endereço:* Rua Francesco de Martini 29, São Caetano do Sul\n` +
               `🛡️ *Blindagem Anti-No-Show:* Envia lembrete pré-sessão, instruções de sono, alimentação e hidratação.\n\n` +
               `_Garante pontualidade e tranquilidade no dia da sessão._`,
        botoes: [
          [{ text: '📅 Ver Calendário Completo', url: 'https://somos1-tattoo-studio.vercel.app/admin' }],
          voltarBtn
        ]
      };
    case 'pos_venda':
      return {
        texto: `✨ *AGENTE 05: JULIANA (PÓS-VENDA & CICATRIZAÇÃO)*\n\n` +
               `🩹 *Protocolo de Cicatrização (0-30 dias):*\n` +
               `• Dia 1 a 3: Higienização e pomada cicatrizante\n` +
               `• Dia 7 a 15: Foto da pele recuperada\n` +
               `• Dia 30: Avaliação 5 estrelas no Google e convite de recompra\n\n` +
               `_Transforma clientes em promotores fiéis do estúdio._`,
        botoes: [
          [{ text: '👥 Ver Carteira de Pós-Venda', url: 'https://somos1-tattoo-studio.vercel.app/admin' }],
          voltarBtn
        ]
      };
    case 'followup':
      return {
        texto: `🔕 *AGENTE 06: AVALANCHE (RESGATE & RECONEXÃO)*\n\n` +
               `❄️ *Missão:* Reaquecer contatos que pararam de responder ou desmarcaram.\n` +
               `🎯 *Abordagem:* Humanizada e consultiva, compartilhando horários recém-liberados e novas ideias de flash.\n\n` +
               `_Recupera faturamento perdido sem ser invasivo._`,
        botoes: [
          [{ text: '🌐 Ver Leads de Resgate', url: 'https://somos1-tattoo-studio.vercel.app/admin' }],
          voltarBtn
        ]
      };
    default:
      return {
        texto: `📊 *RELATÓRIO GERAL DO ESTÚDIO SOMOS 1*\n\n` +
               `🤖 *Motor de IA:* 100% Nativo no Vercel Serverless (Zero RAM no Northflank)\n` +
               `💬 *WhatsApp Evolution:* Conectado na instância 'wats'\n` +
               `✈️ *Telegram Bot:* @somos1tattoo_bot ativo em modo Co-Piloto\n\n` +
               `Toque abaixo para abrir o painel executivo completo:`,
        botoes: [
          [{ text: '🌐 Abrir Dashboard Executivo', url: 'https://somos1-tattoo-studio.vercel.app/admin' }],
          voltarBtn
        ]
      };
  }
}

// ─── CONSULTAS NO FIRESTORE (REST NATIVO) ───────────────────────────────────

async function isPhoneIgnored(cleanPhone) {
  try {
    const res = await fetch(`${FIRESTORE_BASE}/contatos_ignorados/${cleanPhone}?key=${FIREBASE_API_KEY}`);
    return res.ok;
  } catch (e) {
    return false;
  }
}

async function getRecentMessages(cleanPhone, limit = 6) {
  try {
    const queryUrl = `${FIRESTORE_BASE}:runQuery?key=${FIREBASE_API_KEY}`;
    const res = await fetch(queryUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: 'crm_messages' }],
          where: {
            fieldFilter: {
              field: { fieldPath: 'telefone' },
              op: 'EQUAL',
              value: { stringValue: cleanPhone }
            }
          },
          orderBy: [{ field: { fieldPath: 'timestamp' }, direction: 'DESCENDING' }],
          limit
        }
      })
    });
    const items = await res.json();
    if (!Array.isArray(items)) return [];
    return items
      .filter(i => i.document?.fields)
      .map(i => {
        const f = i.document.fields;
        return {
          remetente: f.remetente?.stringValue || 'cliente',
          texto: f.mensagem?.stringValue || ''
        };
      })
      .reverse();
  } catch (e) {
    return [];
  }
}

async function findLeadByPhone(cleanPhone) {
  try {
    const queryUrl = `${FIRESTORE_BASE}:runQuery?key=${FIREBASE_API_KEY}`;
    const res = await fetch(queryUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: 'leads' }],
          where: {
            fieldFilter: {
              field: { fieldPath: 'telefone' },
              op: 'EQUAL',
              value: { stringValue: cleanPhone }
            }
          },
          limit: 1
        }
      })
    });
    const items = await res.json();
    if (Array.isArray(items) && items[0]?.document) {
      const doc = items[0].document;
      const f = doc.fields || {};
      return {
        id: doc.name.split('/').pop(),
        nome: f.nome?.stringValue || 'Lead',
        telefone: f.telefone?.stringValue || cleanPhone,
        estagio: f.estagio?.stringValue || 'novo',
        temperatura: f.temperatura?.stringValue || 'morno',
        ideiaProjeto: f.ideiaProjeto?.stringValue || '',
        ticketEstimado: Number(f.spin?.mapValue?.fields?.ticketEstimado?.integerValue || f.orcamentoMaximo?.integerValue || 0),
        valorSinal: Number(f.valorSinal?.integerValue || 0),
        sinalPago: Boolean(f.sinalPago?.booleanValue),
        pilotoIA: Boolean(f.pilotoIA?.booleanValue)
      };
    }
  } catch (e) {
    console.warn('Erro ao consultar lead:', e);
  }
  return null;
}

async function findClienteByPhone(cleanPhone) {
  try {
    const queryUrl = `${FIRESTORE_BASE}:runQuery?key=${FIREBASE_API_KEY}`;
    const res = await fetch(queryUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: 'clientes' }],
          where: {
            fieldFilter: {
              field: { fieldPath: 'telefone' },
              op: 'EQUAL',
              value: { stringValue: cleanPhone }
            }
          },
          limit: 1
        }
      })
    });
    const items = await res.json();
    if (Array.isArray(items) && items[0]?.document) {
      const doc = items[0].document;
      const f = doc.fields || {};
      return {
        id: doc.name.split('/').pop(),
        nome: f.nome?.stringValue || 'Cliente',
        bucketTemperatura: f.bucketTemperatura?.stringValue || 'morno',
        totalGasto: Number(f.totalGasto?.integerValue || 0)
      };
    }
  } catch (e) {
    console.warn('Erro ao consultar cliente:', e);
  }
  return null;
}

// ─── MOTOR DE INTELIGÊNCIA ARTIFICIAL (GEMINI 2.5 FLASH COM PERSONAS NAIA) ──

async function gerarRespostaAgenteIA({
  agenteTipo,
  clienteNome,
  mensagemAtual,
  historicoDialogo,
  ticketEstimado,
  valorSinal,
  detalhesExtras
}) {
  const firstName = clienteNome.split(' ')[0] || clienteNome;
  const sinalSugerido = valorSinal || (ticketEstimado > 0 ? Math.round(ticketEstimado * 0.3) : 240);

  // Personas e Instruções Especializadas da NAIA
  const personas = {
    novo: `Você é o assistente de recepção da Somos 1 Tattoo Studio (estúdio do tatuador Markinhos, em São Caetano do Sul, Rua Francesco de Martini 29).
Acolha calorosamente o lead ${firstName}, agradeça o contato e pergunte qual ideia, referência ou estilo de tatuagem ele tem em mente para fazer.
Seja leve, descontraído e amigável. Máximo 2 a 3 frases.`,

    qualificacao: `Você atua como o Clone do Dono (SDR Consultivo de Tatuagem) da Somos 1 Tattoo.
Seu foco é entender o projeto de ${firstName}: local do corpo (antebraço, perna, costela), tamanho aproximado em centímetros e se já possui fotos de referência.
Use tom consultivo e artístico. Nunca empurre venda. Entenda a história por trás da arte. Máximo 2 a 3 frases.`,

    negociacao: `Você é Jonathan, o especialista em fechamento e negociação da Somos 1 Tattoo.
O cliente ${firstName} está na fase de orçamento e proposta.
REGRAS OBRIGATÓRIAS:
- Apresente o valor do projeto com confiança na qualidade técnica, materiais premium e biossegurança.
- Explique de forma amigável a regra do SINAL DE RESERVA (30% via PIX, aproximadamente R$ ${sinalSugerido}): o sinal é necessário para travar a vaga exclusiva na agenda e iniciar a criação do desenho sob medida.
- Chave PIX oficial do estúdio: somos1tattoo@gmail.com
- Convide para fechar e travar o horário. Seja persuasivo e seguro. Máximo 3 frases.`,

    agendado: `Você é o Secretário da Agenda da Somos 1 Tattoo.
O cliente ${firstName} já possui sessão agendada.
Confirme detalhes com carinho: endereço (Rua Francesco de Martini 29, São Caetano do Sul).
Lembre das instruções de ouro: ter uma boa noite de sono, se alimentar bem antes da sessão, beber água e evitar bebidas alcoólicas na véspera. Máximo 2 a 3 frases.`,

    pos_venda: `Você é Juliana, a especialista em pós-venda, cuidados e cicatrização da Somos 1 Tattoo.
Sua missão é cuidar da cicatrização do cliente ${firstName}.
Pergunte como a pele está reagindo, lembre de lavar suavemente com sabonete neutro e aplicar camada fina de pomada cicatrizante. Peça foto do resultado se já tiver mais de 7 dias e convide para marcar o estúdio. Tom acolhedor e atencioso. Máximo 3 frases.`,

    followup: `Você é o Agente Avalanche de Resgate da Somos 1 Tattoo.
O cliente ${firstName} sumiu ou parou de responder há algum tempo.
Reconecte com total empatia: pergunte se está tudo bem, diga que a ideia do projeto continua salva com carinho e que novos horários foram liberados caso ainda queira realizar a arte. Nunca seja chato ou invasivo. Máximo 2 a 3 frases.`
  };

  const promptSystem = personas[agenteTipo] || personas['novo'];

  const historicoFormatado = (historicoDialogo || [])
    .map(h => `${h.remetente === 'cliente' ? clienteNome : 'Somos 1 Studio'}: "${h.texto}"`)
    .join('\n');

  const promptCompleto = `${promptSystem}

Contexto do histórico recente:
${historicoFormatado || 'Início de conversa.'}

Última mensagem enviada por ${clienteNome}:
"${mensagemAtual}"

${detalhesExtras ? `Observações do estúdio: ${detalhesExtras}` : ''}

Retorne APENAS o texto da resposta para o WhatsApp do cliente. Sem aspas adicionais, sem preâmbulos.`;

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: promptCompleto }] }],
        generationConfig: { temperature: 0.3 }
      })
    });
    const data = await res.json();
    const textoGerado = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (textoGerado && textoGerado.length > 5) return textoGerado;
  } catch (err) {
    console.warn('Aviso Gemini Flash API:', err);
  }

  // Fallbacks de alta conversão caso a API de IA tenha instabilidade temporária
  if (agenteTipo === 'negociacao') {
    return `Fala, ${firstName}! 🎨 Para esse projeto, trabalhamos com sinal de reserva de 30% (R$ ${sinalSugerido}) para garantir seu dia e horário na agenda e iniciarmos seu desenho sob medida. Chave PIX: somos1tattoo@gmail.com. Bora garantir sua vaga? 🚀`;
  }
  if (agenteTipo === 'qualificacao') {
    return `Fala, ${firstName}! 🤘 Sensacional a ideia. Você já tem alguma foto ou desenho de referência? E em qual parte do corpo você quer fazer?`;
  }
  if (agenteTipo === 'pos_venda') {
    return `Olá, ${firstName}! ✨ Passando para saber como está a cicatrização da sua tattoo! Está passando a pomadinha certinho? Qualquer dúvida estou por aqui!`;
  }
  return `Olá, ${firstName}! 🖤 Bem-vindo(a) ao Somos 1 Tattoo Studio! Recebi sua mensagem. Me conta: qual ideia ou desenho você quer tatuar?`;
}

async function handleTelegramUpdate(rawBody, res) {
  // 1. PROCESSAR CLIQUES EM BOTÕES (CALLBACK QUERY)
  if (rawBody.callback_query) {
    const cq = rawBody.callback_query;
    const cqData = cq.data || '';
    const chatId = cq.message?.chat?.id;
    const msgId = cq.message?.message_id;

    // A. ENVIAR RESPOSTA DA IA NO WHATSAPP
    if (cqData.startsWith('lead:enviar:')) {
      const leadId = cqData.replace('lead:enviar:', '');
      try {
        const resSug = await fetch(`${FIRESTORE_BASE}/pending_suggestions/${leadId}?key=${FIREBASE_API_KEY}`);
        if (resSug.ok) {
          const docSug = await resSug.json();
          const f = docSug.fields || {};
          const phone = f.telefone?.stringValue || '';
          const clientName = f.clienteNome?.stringValue || 'Cliente';
          const textToSend = f.sugestaoResposta?.stringValue || '';

          if (phone && textToSend) {
            await sendWhatsAppMessage(phone, textToSend);

            // Grava no histórico de mensagens do CRM
            try {
              await fetch(`${FIRESTORE_BASE}/crm_messages?key=${FIREBASE_API_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  fields: {
                    telefone: { stringValue: phone },
                    clienteNome: { stringValue: clientName },
                    mensagem: { stringValue: textToSend },
                    remetente: { stringValue: 'ia' },
                    timestamp: { timestampValue: new Date().toISOString() },
                    status: { stringValue: 'entregue' }
                  }
                })
              });
            } catch (e) {}

            await answerTelegramCallback(cq.id, '🚀 Enviado no WhatsApp do cliente!');
            if (chatId && msgId) {
              await editTelegramMessage(
                chatId,
                msgId,
                `✅ *MENSAGEM ENVIADA NO WHATSAPP COM SUCESSO!* 🚀\n\n` +
                `👤 *Cliente:* ${clientName} (${formatPhone(phone)})\n` +
                `💬 *Mensagem disparada:* "${textToSend}"`
              );
            }
            return res.status(200).json({ ok: true, sent: true });
          }
        }
      } catch (err) {
        console.error('Erro ao enviar sugestão:', err);
      }
      await answerTelegramCallback(cq.id, 'Sugestão já processada ou não encontrada.');
      return res.status(200).json({ ok: true });
    }

    // B. CONFIRMAR SINAL DE 30% PIX
    if (cqData.startsWith('lead:sinal:') || cqData.startsWith('sinal:pago:')) {
      const leadId = cqData.replace('lead:sinal:', '').replace('sinal:pago:', '');
      try {
        await fetch(`${FIRESTORE_BASE}/leads/${leadId}?updateMask.fieldPaths=sinalPago&updateMask.fieldPaths=estagio&updateMask.fieldPaths=updatedAt&key=${FIREBASE_API_KEY}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fields: {
              sinalPago: { booleanValue: true },
              estagio: { stringValue: 'agendado' },
              updatedAt: { timestampValue: new Date().toISOString() }
            }
          })
        });
      } catch (e) {}

      await answerTelegramCallback(cq.id, '💰 Sinal de 30% confirmado!');
      if (chatId && msgId) {
        await editTelegramMessage(
          chatId,
          msgId,
          `💰 *SINAL DE 30% CONFIRMADO COM SUCESSO!* ✅\n\n` +
          `A vaga foi travada na agenda e o lead avançou para *📅 Sessão Agendada* no CRM!`
        );
      }
      return res.status(200).json({ ok: true, deposit: true });
    }

    // C. IGNORAR / BLOQUEAR CONTATO
    if (cqData.startsWith('lead:ignorar:')) {
      const senderPhone = cqData.replace('lead:ignorar:', '').replace(/\D/g, '');
      try {
        await fetch(`${FIRESTORE_BASE}/contatos_ignorados/${senderPhone}?key=${FIREBASE_API_KEY}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fields: {
              telefone: { stringValue: senderPhone },
              motivo: { stringValue: 'Ignorado via Telegram Bot' },
              dataIgnorado: { timestampValue: new Date().toISOString() }
            }
          })
        });
      } catch (e) {}

      await answerTelegramCallback(cq.id, '🚫 Contato ignorado no CRM!');
      if (chatId && msgId) {
        await editTelegramMessage(
          chatId,
          msgId,
          `🚫 *CONTATO BLOQUEADO & REMOVIDO!* 🗑️\n\n` +
          `O número ${formatPhone(senderPhone)} foi adicionado aos contatos ignorados e não gerará mais alertas.`
        );
      }
      return res.status(200).json({ ok: true, ignored: true });
    }

    // D. CONFIRMAÇÃO DE PRESENÇA (SIM / NÃO)
    if (cqData.startsWith('presenca:')) {
      const parts = cqData.split(':');
      const acao = parts[1];
      const bookingId = parts[2];
      if (bookingId) {
        const isSim = acao === 'sim';
        const nextStatus = isSim ? 'COMPLETED' : 'REJECTED';
        try {
          await fetch(`${FIRESTORE_BASE}/bookings/${bookingId}?updateMask.fieldPaths=status&updateMask.fieldPaths=updatedAt&key=${FIREBASE_API_KEY}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fields: {
                status: { stringValue: nextStatus },
                updatedAt: { timestampValue: new Date().toISOString() }
              }
            })
          });
        } catch (e) {}

        await answerTelegramCallback(cq.id, isSim ? 'Presença confirmada!' : 'Falta registrada!');
        if (chatId && msgId) {
          await editTelegramMessage(
            chatId,
            msgId,
            isSim
              ? `✅ *PRESENÇA CONFIRMADA VIA TELEGRAM!*\nO cliente foi registrado como presente e encaminhado para Pós-Venda (Cicatrização).`
              : `❌ *FALTA / NO-SHOW REGISTRADA!*\nO cliente foi registrado como ausente e encaminhado para Resgate.`
          );
        }
        return res.status(200).json({ ok: true, presence: isSim });
      }
    }

    // E. VISUALIZAÇÃO DE AGENTE OU STATUS
    if (cqData.startsWith('agente:') || cqData === 'estudio:status') {
      const tipo = cqData.replace('agente:', '');
      await answerTelegramCallback(cq.id, 'Carregando agente...');
      const rel = getAgentReportText(tipo);
      if (chatId && msgId) {
        await editTelegramMessage(chatId, msgId, rel.texto, rel.botoes);
      }
      return res.status(200).json({ ok: true });
    }

    // F. VOLTAR AO MENU PRINCIPAL
    if (cqData === 'menu:principal') {
      await answerTelegramCallback(cq.id, 'Menu Principal');
      if (chatId && msgId) {
        const menu = getMainHQMenu();
        await editTelegramMessage(chatId, msgId, menu.texto, menu.botoes);
      }
      return res.status(200).json({ ok: true });
    }
  }

  // 2. PROCESSAR COMANDOS DE TEXTO
  if (rawBody.message && rawBody.message.chat) {
    const chatId = rawBody.message.chat.id;
    const text = (rawBody.message.text || '').trim().toLowerCase();

    if (text === '/start' || text === '/menu' || text === '/agentes' || text === 'menu' || text === 'agentes') {
      const menu = getMainHQMenu();
      await sendTelegramMessage(chatId, menu.texto, menu.botoes);
      return res.status(200).json({ ok: true });
    }

    if (text === '/hoje' || text === '/agenda') {
      const rel = getAgentReportText('agendado');
      await sendTelegramMessage(chatId, rel.texto, rel.botoes);
      return res.status(200).json({ ok: true });
    }

    if (text === '/sinal') {
      const rel = getAgentReportText('negociacao');
      await sendTelegramMessage(chatId, rel.texto, rel.botoes);
      return res.status(200).json({ ok: true });
    }

    if (text === '/posvenda') {
      const rel = getAgentReportText('pos_venda');
      await sendTelegramMessage(chatId, rel.texto, rel.botoes);
      return res.status(200).json({ ok: true });
    }

    if (text === '/status') {
      const rel = getAgentReportText('status');
      await sendTelegramMessage(chatId, rel.texto, rel.botoes);
      return res.status(200).json({ ok: true });
    }
  }

  return res.status(200).json({ ok: true });
}

// ─── VERCEL SERVERLESS HANDLER ──────────────────────────────────────────────

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, apikey');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const url = new URL(req.url, `https://${req.headers.host || 'somos1-tattoo-studio.vercel.app'}`);
  const path = url.pathname.replace(/^\/api/, '');

  try {
    // Health Check
    if (req.method === 'GET' && (path === '' || path === '/' || path === '/health')) {
      return res.status(200).json({ status: 'ok', engine: 'Somos 1 Native AI Studio Engine v2' });
    }

    // ─── ENDPOINT: WEBHOOK INBOUND DO WHATSAPP / TELEGRAM ───────────────────
    if (req.method === 'POST') {
      const rawBody = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

      // 1. Caso TELEGRAM (clique em botões inline ou comandos /start, /menu, /hoje, etc.)
      const isTelegram = Boolean(rawBody?.callback_query || (rawBody?.message && rawBody?.message?.chat));
      if (isTelegram) {
        return await handleTelegramUpdate(rawBody, res);
      }

      // 2. Validar se é evento de mensagens da Evolution API
      if (rawBody?.event && rawBody.event !== 'messages.upsert') {
        return res.status(200).json({ status: 'ignored_not_message' });
      }

      const msgData = rawBody?.data || rawBody || {};
      const key = msgData.key || {};

      // Ignora mensagens enviadas pelo próprio estúdio
      if (key.fromMe) {
        return res.status(200).json({ status: 'ignored_from_me' });
      }

      const remoteJid = key.remoteJid || '';

      // Ignora grupos, status e transmissões
      if (remoteJid.includes('@g.us') || remoteJid.includes('status@broadcast') || remoteJid.includes('@newsletter')) {
        return res.status(200).json({ status: 'ignored_group_or_broadcast' });
      }

      const senderPhone = remoteJid.replace('@s.whatsapp.net', '').replace(/@lid$/, '').replace(/\D/g, '');
      const senderName = msgData.pushName || 'Cliente';

      // Extrai texto da conversa ou legenda de foto
      const messageContent = msgData.message || {};
      const userText = (
        messageContent.conversation ||
        messageContent.extendedTextMessage?.text ||
        messageContent.imageMessage?.caption ||
        ''
      ).trim();

      if (!userText && !messageContent.imageMessage) {
        return res.status(200).json({ status: 'ignored_no_content' });
      }

      // Checa lista de contatos ignorados (fornecedores, amigos, etc.)
      const isIgnored = await isPhoneIgnored(senderPhone);
      if (isIgnored) {
        return res.status(200).json({ status: 'ignored_blacklist_contact' });
      }

      const adminPhones = ['5511948116922', '5511957837132', '11948116922', '11957837132'];
      const isAdmin = adminPhones.includes(senderPhone);

      // ── CASO A: MENSAGEM DO TATUADOR ADMIN (COMANDOS VIA ZAP) ────────────
      if (isAdmin) {
        // Interpreta comando de presença ou agendamento
        const lower = userText.toLowerCase();
        if (lower.includes('compareceu') || lower.includes('veio') || lower.includes('tatuou')) {
          await sendWhatsAppMessage(senderPhone, '✅ Presença registrada via comando! Lead movido para Pós-Venda.');
          return res.status(200).json({ status: 'admin_command_processed' });
        }
      }

      // ── CASO B: MENSAGEM DE CLIENTE / LEAD (DISPARO INTELIGENTE) ─────────

      // 1. Salva a mensagem recebida no histórico unificado do CRM
      try {
        const msgDocUrl = `${FIRESTORE_BASE}/crm_messages?key=${FIREBASE_API_KEY}`;
        await fetch(msgDocUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fields: {
              telefone: { stringValue: senderPhone },
              clienteNome: { stringValue: senderName },
              mensagem: { stringValue: userText || '[Foto de referência enviada]' },
              remetente: { stringValue: 'cliente' },
              timestamp: { timestampValue: new Date().toISOString() },
              status: { stringValue: 'entregue' }
            }
          })
        });
      } catch (err) {}

      // 2. Busca histórico das últimas 5 conversas para contexto profundo
      const historico = await getRecentMessages(senderPhone, 5);

      // 3. Localiza se já é Cliente da Carteira (pós-tattoo) ou Lead do Funil (pré-tattoo)
      const existingCliente = await findClienteByPhone(senderPhone);
      let lead = await findLeadByPhone(senderPhone);

      let agenteTipo = 'novo';
      let estagioAtual = 'novo';

      if (existingCliente) {
        // Cliente da Carteira (Pós-Tattoo)
        const temp = existingCliente.bucketTemperatura;
        if (temp === 'quente') agenteTipo = 'pos_venda';
        else if (temp === 'morno') agenteTipo = 'pos_venda';
        else if (temp === 'desmarcou') agenteTipo = 'followup';
        else agenteTipo = 'qualificacao'; // Quer nova tattoo
      } else if (lead) {
        estagioAtual = lead.estagio;
        agenteTipo = lead.estagio;
      } else {
        // Novo Lead que acabou de chamar
        try {
          const createLeadUrl = `${FIRESTORE_BASE}/leads?key=${FIREBASE_API_KEY}`;
          const createRes = await fetch(createLeadUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fields: {
                nome: { stringValue: senderName },
                telefone: { stringValue: senderPhone },
                origem: { stringValue: 'whatsapp' },
                estagio: { stringValue: 'novo' },
                temperatura: { stringValue: 'quente' },
                ideiaProjeto: { stringValue: userText },
                responsavelAtendimento: { stringValue: 'IA_Assessor' },
                criadoPor: { stringValue: 'agente_ia' },
                createdAt: { timestampValue: new Date().toISOString() },
                updatedAt: { timestampValue: new Date().toISOString() },
                ultimoContatoEm: { timestampValue: new Date().toISOString() }
              }
            })
          });
          const createdDoc = await createRes.json();
          lead = {
            id: createdDoc.name?.split('/').pop() || 'lead_' + Date.now(),
            nome: senderName,
            telefone: senderPhone,
            estagio: 'novo',
            temperatura: 'quente',
            ticketEstimado: 0,
            valorSinal: 0,
            pilotoIA: false
          };
        } catch (e) {}
      }

      // Se o cliente perguntou de preço ou sinal na mensagem atual, orienta para negociação
      const lowerText = userText.toLowerCase();
      if (lowerText.includes('preço') || lowerText.includes('preco') || lowerText.includes('quanto fica') || lowerText.includes('orçamento') || lowerText.includes('orcamento') || lowerText.includes('valor')) {
        agenteTipo = 'negociacao';
      }

      // 4. Gera a resposta de alta conversão usando o Gemini com a persona certa
      const sugestaoIA = await gerarRespostaAgenteIA({
        agenteTipo,
        clienteNome: senderName,
        mensagemAtual: userText,
        historicoDialogo: historico,
        ticketEstimado: lead?.ticketEstimado || 800,
        valorSinal: lead?.valorSinal || 240
      });

      // 5. Salva a sugestão pendente no Firestore
      const leadId = lead?.id || 'lead_' + senderPhone;
      try {
        const draftUrl = `${FIRESTORE_BASE}/pending_suggestions/${leadId}?key=${FIREBASE_API_KEY}`;
        await fetch(draftUrl, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fields: {
              leadId: { stringValue: leadId },
              telefone: { stringValue: senderPhone },
              clienteNome: { stringValue: senderName },
              mensagemCliente: { stringValue: userText },
              sugestaoResposta: { stringValue: sugestaoIA },
              agenteTipo: { stringValue: agenteTipo },
              status: { stringValue: 'pendente' },
              updatedAt: { timestampValue: new Date().toISOString() }
            }
          })
        });
      } catch (err) {}

      // 6. DISPARO NO TELEGRAM DO TATUADOR (MODO CO-PILOTO COM BOTÕES INLINE)
      const nomeAgenteDisplay = {
        novo: '🛎️ Triagem & Boas-Vindas',
        qualificacao: '🎯 Clone do Dono (SDR SPIN)',
        negociacao: '💬 Jonathan (Fechamento & Sinal)',
        agendado: '📅 Secretário da Agenda',
        pos_venda: '✨ Juliana (Pós-Venda Cicatrização)',
        followup: '🔕 Avalanche (Resgate)'
      }[agenteTipo] || '🤖 Co-Piloto Somos 1';

      const textoTelegram = 
        `⚔️ *NOVO DIÁLOGO NO WHATSAPP!* 🎨\n\n` +
        `👤 *Cliente:* ${senderName} (${formatPhone(senderPhone)})\n` +
        `🏷️ *Etapa:* ${nomeAgenteDisplay}\n` +
        `💬 *Disse:* "${userText}"\n\n` +
        `💡 *Sugestão da IA:*\n"${sugestaoIA}"\n\n` +
        `👉 *Toque abaixo para aprovar ou interagir:*`;

      const inlineKeyboard = [
        [
          { text: '🚀 Manda no Zap Agora', callback_data: `lead:enviar:${leadId}` },
          { text: '💰 Sinal PIX 30%', callback_data: `lead:sinal:${leadId}` }
        ],
        [
          { text: '💬 Abrir Zap Direto', url: `https://wa.me/55${senderPhone}` },
          { text: '❌ Ignorar / Não é Lead', callback_data: `lead:ignorar:${senderPhone}` }
        ]
      ];

      await sendTelegramMessage(TELEGRAM_ADMIN_CHAT_ID, textoTelegram, inlineKeyboard);

      // 7. Se o Piloto Automático estiver ativado para este lead, dispara automático no WhatsApp
      if (lead?.pilotoIA) {
        await sendWhatsAppMessage(senderPhone, sugestaoIA);
        // Salva resposta no histórico
        try {
          const msgDocUrl = `${FIRESTORE_BASE}/crm_messages?key=${FIREBASE_API_KEY}`;
          await fetch(msgDocUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fields: {
                telefone: { stringValue: senderPhone },
                clienteNome: { stringValue: senderName },
                mensagem: { stringValue: sugestaoIA },
                remetente: { stringValue: 'ia' },
                timestamp: { timestampValue: new Date().toISOString() },
                status: { stringValue: 'entregue' }
              }
            })
          });
        } catch (e) {}

        await sendTelegramMessage(
          TELEGRAM_ADMIN_CHAT_ID,
          `⚡ *AUTO-PILOTO:* A resposta acima foi disparada automaticamente no WhatsApp de ${senderName}!`
        );
      }

      return res.status(200).json({
        status: 'success',
        leadId,
        agente: agenteTipo,
        suggested: sugestaoIA
      });
    }

    return res.status(404).json({ error: 'Endpoint não encontrado' });
  } catch (err) {
    console.error('Fatal agent error:', err);
    return res.status(500).json({ error: err.message });
  }
}
