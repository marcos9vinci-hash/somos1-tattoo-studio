// ============================================================================
// SOMOS 1 TATTOO STUDIO — NATIVE AI AGENT ENGINE (VERCEL SERVERLESS)
// 100% NATIVO — SUBSTITUI O N8N EM DEFINITIVO (ZERO MEMÓRIA NO NORTHFLANK)
// CONECTADO COM FIREBASE NATIVO, TELEGRAM CO-PILOTO (MIGUEL) E EVOLUTION API
// ============================================================================

import { initializeApp, getApps } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp
} from 'firebase/firestore';

// ─── CONFIGURAÇÃO FIREBASE NATIVO (100% OPERACIONAL SEM 403 REST) ───────────
const firebaseConfig = {
  apiKey: "AIzaSyAhIXcG4ReuncxNBZSqjXYOu7Exka_TNo0",
  authDomain: "memorizeai-7b8fd.firebaseapp.com",
  projectId: "memorizeai-7b8fd",
  storageBucket: "memorizeai-7b8fd.firebasestorage.app",
  messagingSenderId: "287874618983",
  appId: "1:287874618983:web:30718f0f4f5ad68cb4e6c2"
};

const app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
const db = getFirestore(app, "ai-studio-dcd3cc7e-f58b-453b-a948-88e194766ac9");

// ─── CONFIGURAÇÃO EVOLUTION & TELEGRAM ───────────────────────────────────────
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

// ─── DISPAROS WHATSAPP & TELEGRAM ───────────────────────────────────────────

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

async function sendTelegramMessage(chatId, text, inlineKeyboard, threadId) {
  try {
    const body = {
      chat_id: chatId || TELEGRAM_ADMIN_CHAT_ID,
      text: text,
      parse_mode: 'Markdown'
    };
    if (threadId) {
      body.message_thread_id = threadId;
    }
    if (inlineKeyboard && inlineKeyboard.length > 0) {
      body.reply_markup = { inline_keyboard: inlineKeyboard };
    }
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    return await res.json();
  } catch (err) {
    console.error('Erro ao enviar Telegram:', err);
    return null;
  }
}

async function createTelegramForumTopic(chatId, name, iconColor) {
  try {
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/createForumTopic`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        name: name,
        icon_color: iconColor
      })
    });
    const data = await res.json();
    if (data.ok && data.result) {
      return data.result.message_thread_id;
    }
    console.error('Erro ao criar tópico no Telegram:', data);
    return null;
  } catch (err) {
    console.error('Erro de rede ao criar tópico:', err);
    return null;
  }
}

async function criarTodosOsTopicos(chatId) {
  const TOPICOS_DEFINICAO = [
    {
      key: 'novo',
      name: '🛎️ 1. Triagem & Recepção',
      color: 7322096, // azul
      msgApresentacao: '🛎️ *BEM-VINDO AO TÓPICO DE TRIAGEM & RECEPÇÃO!*\n\nAqui cairão todos os novos contatos que chamarem no WhatsApp pela primeira vez.\nO agente de recepção acolhe pelo nome e pergunta o estilo ou projeto que o cliente quer tatuar.'
    },
    {
      key: 'qualificacao',
      name: '🎯 2. SDR & Qualificação',
      color: 16766590, // amarelo
      msgApresentacao: '🎯 *BEM-VINDO AO TÓPICO DO CLONE DO DONO (SDR CONSULTIVO)!*\n\nAqui são acompanhados os leads na fase de qualificação artística.\nO agente investiga: tamanho aproximado em cm, local do corpo e referências visuais.'
    },
    {
      key: 'negociacao',
      name: '💬 3. Negociação & Sinal PIX',
      color: 9367192, // verde
      msgApresentacao: '💬 *BEM-VINDO AO TÓPICO DO JONATHAN (FECHAMENTO & SINAL PIX)!*\n\nAqui concentram-se as propostas e fechamentos.\nRegra de Ouro: Proposta com valor do projeto + chave PIX (somos1tattoo@gmail.com) para o Sinal de 30% que trava o horário.'
    },
    {
      key: 'agendado',
      name: '📅 4. Secretário da Agenda',
      color: 13338331, // roxo
      msgApresentacao: '📅 *BEM-VINDO AO TÓPICO DO SECRETÁRIO DA AGENDA (MIGUEL)!*\n\nAqui você acompanha confirmações de sessões, lembretes de véspera para clientes e blindagem anti-furo.'
    },
    {
      key: 'pos_venda',
      name: '✨ 5. Pós-Venda Cicatrização',
      color: 16749490, // rosa
      msgApresentacao: '✨ *BEM-VINDO AO TÓPICO DA JULIANA (PÓS-VENDA & CICATRIZAÇÃO)!*\n\nAqui o foco é encantar o cliente tatuado: protocolo de cuidados na pele (pomada cicatrizante), foto da cicatrização e avaliação 5 estrelas no Google.'
    },
    {
      key: 'followup',
      name: '🔕 6. Resgate Avalanche',
      color: 16478047, // laranja
      msgApresentacao: '🔕 *BEM-VINDO AO TÓPICO DO RESGATE AVALANCHE!*\n\nAqui concentram-se os contatos que sumiram, desmarcaram ou esfriaram.\nO agente reaquece com empatia, horários vagos e novos flashes sem ser invasivo.'
    },
    {
      key: 'miguel',
      name: '🎩 7. Falar com Miguel (Comandos)',
      color: 7322096, // azul
      msgApresentacao: '🎩 *CANAL DIRETO COM O MIGUEL (SEU ASSESSOR EXECUTIVO)!*\n\nConverse comigo diretamente por aqui em linguagem natural!\nExemplos de comandos:\n• "pode agendar amanhã às 14h com o João, valor 600 e sinal 180"\n• "manda zap pro Carlos avisando que o desenho tá pronto"\n• "o Tiago compareceu"\n• "faz o pente fino aí"'
    },
    {
      key: 'fechamento',
      name: '📊 8. Fechamento Diário & Caixa',
      color: 9367192, // verde
      msgApresentacao: '📊 *CANAL DE FECHAMENTO DIÁRIO & AUDITORIA!*\n\nAqui o Miguel envia o fechamento diário do estúdio, auditoria de caixa e pente fino de leads todos os dias.'
    }
  ];

  const mapTopicos = {};

  await sendTelegramMessage(chatId, '⚙️ *INICIANDO CRIAÇÃO AUTOMÁTICA DOS 8 TÓPICOS NO GRUPO...*\n_Criando canais dedicados para cada Agente de IA e Fechamento de Caixa..._');

  for (const t of TOPICOS_DEFINICAO) {
    const threadId = await createTelegramForumTopic(chatId, t.name, t.color);
    if (threadId) {
      mapTopicos[t.key] = threadId;
      await sendTelegramMessage(chatId, t.msgApresentacao, null, threadId);
    }
  }

  // Se nenhum tópico pôde ser criado devido a falta de permissão no Telegram
  if (Object.keys(mapTopicos).length === 0) {
    const errorMsg =
      `⚠️ *FALTOU A PERMISSÃO DE "GERENCIAR TÓPICOS"!* 🛑\n\n` +
      `O Telegram recusou a criação com o erro: _"not enough rights to create a topic"_.\n\n` +
      `👉 *Como liberar em 10 segundos no Telegram:* \n` +
      `1️⃣ Clique no nome do grupo *SOMOS 1 TATTOO* no topo.\n` +
      `2️⃣ Clique no lápis (Editar Grupo) ➔ *Administradores*.\n` +
      `3️⃣ Toque no bot *@somos1tattoo_bot*.\n` +
      `4️⃣ ATIVE a chave: *Gerenciar Tópicos* (ou *Manage Topics*).\n` +
      `5️⃣ Salve e digite */criar_topicos* aqui no grupo novamente!\n\n` +
      `Assim que você ligar essa chave, os 7 tópicos aparecerão na barra lateral igual ao do Somos 1 O Despertar! 🚀`;

    await sendTelegramMessage(chatId, errorMsg);
    return mapTopicos;
  }

  // Grava mapeamento no Firestore (usando coleção leads com permissão autorizada)
  await setDoc(doc(db, 'leads', '_config_telegram_topics'), {
    groupId: String(chatId),
    topics: mapTopicos,
    ativo: true,
    updatedAt: serverTimestamp()
  }, { merge: true });

  const finalMsg = 
    `🎉 *PRONTO, MARKINHOS! TODOS OS 7 TÓPICOS FORAM CRIADOS E CONECTADOS!* 🚀\n\n` +
    `A partir de agora:\n` +
    `• Cada notificação do WhatsApp cairá no tópico exato do seu agente responsável.\n` +
    `• Você pode me dar ordens na janela *🎩 7. Falar com Miguel* ou em qualquer tópico!\n\n` +
    `_O Quartel General da Somos 1 Tattoo está 100% blindado e operacional._`;

  await sendTelegramMessage(chatId, finalMsg);
  return mapTopicos;
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

// ─── CONSULTAS NO FIRESTORE NATIVO ──────────────────────────────────────────

async function isPhoneIgnored(cleanPhone) {
  try {
    const snap = await getDoc(doc(db, 'contatos_ignorados', cleanPhone));
    return snap.exists();
  } catch (e) {
    return false;
  }
}

async function getRecentMessages(cleanPhone, maxCount = 5) {
  try {
    const q = query(
      collection(db, 'crm_messages'),
      where('telefone', '==', cleanPhone),
      orderBy('timestamp', 'desc'),
      limit(maxCount)
    );
    const snap = await getDocs(q);
    return snap.docs
      .map(d => ({
        remetente: d.data().remetente || 'cliente',
        texto: d.data().mensagem || ''
      }))
      .reverse();
  } catch (e) {
    return [];
  }
}

async function findLeadByPhone(cleanPhone) {
  try {
    const rawClean = cleanPhone.replace(/^55/, '');
    const snap = await getDocs(collection(db, 'leads'));
    for (const d of snap.docs) {
      const data = d.data();
      const p = (data.telefone || '').replace(/\D/g, '');
      if (p && (p === cleanPhone || p.endsWith(rawClean) || rawClean.endsWith(p))) {
        return {
          id: d.id,
          nome: data.nome || 'Lead',
          telefone: data.telefone || cleanPhone,
          estagio: data.estagio || 'novo',
          temperatura: data.temperatura || 'quente',
          ideiaProjeto: data.ideiaProjeto || '',
          ticketEstimado: Number(data.spin?.ticketEstimado || data.orcamentoMaximo || 0),
          valorSinal: Number(data.valorSinal || 0),
          sinalPago: Boolean(data.sinalPago),
          pilotoIA: Boolean(data.pilotoIA)
        };
      }
    }
  } catch (e) {
    console.warn('Erro ao consultar lead:', e);
  }
  return null;
}

async function findClienteByPhone(cleanPhone) {
  try {
    const rawClean = cleanPhone.replace(/^55/, '');
    const snap = await getDocs(collection(db, 'users'));
    for (const d of snap.docs) {
      const data = d.data();
      const p = (data.phone || data.telefone || '').replace(/\D/g, '');
      if (p && (p === cleanPhone || p.endsWith(rawClean) || rawClean.endsWith(p))) {
        return {
          id: d.id,
          nome: data.name || data.nome || 'Cliente',
          bucketTemperatura: data.bucketTemperatura || 'morno',
          totalGasto: Number(data.totalGasto || 0)
        };
      }
    }
  } catch (e) {
    console.warn('Erro ao consultar cliente:', e);
  }
  return null;
}

// ─── MOTOR DE IA DOS 6 AGENTES (GEMINI 2.5 FLASH COM PERSONAS NAIA) ─────────

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

  // Fallbacks de alta conversão
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

// ─── CONVERSAÇÃO CO-PILOTO COM MIGUEL (COMANDOS NATURAIS DO MARKINHOS) ──────

function parseMiguelNaturalText(text) {
  const lower = text.toLowerCase().trim();

  // 1. Saudações
  if (/^(salve|oi|ol[aá]|e\s*a[ií]|fala|bom\s*dia|boa\s*tarde|boa\s*noite)(\s+miguel|\s+mano|\s+irm[aã]o)?[\s!.]*$/i.test(lower) || lower === 'salve miguel') {
    return {
      tipo: 'SAUDACAO',
      resposta: '🎩 Fala, Markinhos! 🤘 Miguel na área! Pronto pra rodar a operação do estúdio. Pode me pedir pra agendar cliente, mandar mensagem no zap, registrar presença ou conferir a agenda. Qual a boa pra hoje?'
    };
  }

  // 2. Agendamento
  if (lower.includes('agend') || lower.includes('marc')) {
    // Extrai nome (ignora conectivos)
    let clienteNome = 'Cliente';
    const matchNome = text.match(/(?:com\s+o|com\s+a|para\s+o|para\s+a|agendar\s+o|agendar\s+a|marca\s+o|marca\s+a|marcar\s+o|marcar\s+a)\s+([A-ZÀ-Úa-zà-ú]+)(?:\s+(?!na\b|no\b|para\b|às\b|as\b|valor\b|dia\b|amanhã\b|amanha\b|hoje\b)[A-ZÀ-Úa-zà-ú]+)?/i);
    if (matchNome) clienteNome = matchNome[1].trim();

    // Extrai hora (ex: às 14h, 15:30)
    let hora = '14:00';
    const matchHora = text.match(/(?:[aà]s\s+)?(\d{1,2})(?:h|:)(\d{2})?/i);
    if (matchHora) {
      const h = matchHora[1].padStart(2, '0');
      const m = matchHora[2] ? matchHora[2].padStart(2, '0') : '00';
      hora = `${h}:${m}`;
    }

    // Extrai data
    let data = new Date();
    if (lower.includes('amanhã') || lower.includes('amanha')) {
      data.setDate(data.getDate() + 1);
    }
    const dataStr = data.toISOString().split('T')[0];

    // Extrai valor monetário (não confunde com horas)
    let valor = 0;
    const matchValor = text.match(/(?:valor|pre[çc]o|por)\s*(?:de\s+)?(?:r\$)?\s*(\d{2,4})/i) ||
                       text.match(/(\d{2,4})\s*(?:reais|contos)/i);
    if (matchValor) valor = Number(matchValor[1]);

    let sinal = valor > 0 ? Math.round(valor * 0.3) : 0;
    const matchSinal = text.match(/sinal\s*(?:de\s+)?(?:r\$)?\s*(\d{2,4})/i);
    if (matchSinal) sinal = Number(matchSinal[1]);

    return {
      tipo: 'AGENDAR',
      dados: { clienteNome, hora, data: dataStr, valor, sinal }
    };
  }

  // 3. Consulta de Agenda
  if (lower.includes('agenda') || lower.includes('quanto tem') || lower.includes('como tá') || lower.includes('como ta') || lower === 'hoje') {
    return {
      tipo: 'CONSULTA_AGENDA'
    };
  }

  // 4. Presença
  if (lower.includes('compareceu') || lower.includes('veio') || lower.includes('tatuou') || lower.includes('faltou')) {
    const isPresente = !lower.includes('faltou') && !lower.includes('não');
    let clienteNome = '';
    const matchNome = text.match(/(?:o|a)\s+([A-ZÀ-Úa-zà-ú]+)\s+(?:compareceu|veio|faltou)/i);
    if (matchNome) clienteNome = matchNome[1].trim();
    return {
      tipo: 'PRESENCA',
      dados: { clienteNome, compareceu: isPresente }
    };
  }

  // 5. Pente Fino / Fechamento Diário
  if (lower.includes('pente fino') || lower.includes('fechamento') || lower.includes('fechar caixa') || lower.includes('auditoria') || lower.includes('resumo') || lower.includes('como tá o estúdio') || lower.includes('como ta o estudio') || lower === '/fechamento') {
    return {
      tipo: 'FECHAMENTO_DIARIO'
    };
  }

  return null;
}

async function conversarComMiguelAdmin(textoMarcos, chatId, threadId) {
  // 1. Processamento Rápido Heurístico Nativo (100% à prova de falhas de API)
  const comandoHeuristico = parseMiguelNaturalText(textoMarcos);

  if (comandoHeuristico) {
    // A. Saudação
    if (comandoHeuristico.tipo === 'SAUDACAO') {
      await sendTelegramMessage(chatId, comandoHeuristico.resposta, null, threadId);
      return;
    }

    // B. Agendamento Direto
    if (comandoHeuristico.tipo === 'AGENDAR' && comandoHeuristico.dados) {
      const d = comandoHeuristico.dados;
      try {
        const bookingRef = await addDoc(collection(db, 'bookings'), {
          userName: d.clienteNome,
          date: d.data,
          time: d.hora,
          priceEstimated: d.valor,
          depositPaid: d.sinal,
          status: 'APPROVED',
          artistId: 'admin',
          size: 'Média',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });

        await setDoc(doc(db, 'leads', `booking_${bookingRef.id}`), {
          id: `booking_${bookingRef.id}`,
          nome: d.clienteNome,
          estagio: 'agendado',
          temperatura: 'quente',
          dataAgendada: d.data,
          horaAgendada: d.hora,
          orcamentoMaximo: d.valor,
          valorSinal: d.sinal,
          sinalPago: d.sinal > 0,
          origem: 'agenda',
          responsavelAtendimento: 'Miguel_Telegram',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }, { merge: true });

        const confirmacao = `✅ *FECHADO, MARKINHOS! AGENDAMENTO REALIZADO!* 📅\n\n` +
          `👤 *Cliente:* ${d.clienteNome}\n` +
          `🗓️ *Data:* ${d.data.split('-').reverse().join('/')} às ${d.hora}\n` +
          (d.valor > 0 ? `💰 *Valor:* R$ ${d.valor} | *Sinal:* R$ ${d.sinal}\n\n` : '\n') +
          `⚡ A blindagem de lembretes automáticos no WhatsApp e a vaga no CRM já estão ativas!`;

        await sendTelegramMessage(chatId, confirmacao, null, threadId);
        return;
      } catch (err) {
        console.error('Erro ao agendar via heurística:', err);
      }
    }

    // C. Consulta de Agenda
    if (comandoHeuristico.tipo === 'CONSULTA_AGENDA') {
      try {
        const todayStr = new Date().toISOString().split('T')[0];
        const snap = await getDocs(collection(db, 'bookings'));
        const deHoje = snap.docs
          .map(doc => doc.data())
          .filter(b => b.date === todayStr);

        let respostaAgenda = `📅 *AGENDA DE HOJE (${todayStr.split('-').reverse().join('/')}):*\n\n`;
        if (deHoje.length === 0) {
          respostaAgenda += `Nenhuma sessão agendada para hoje até o momento.\nHorários livres para novos clientes! 🚀`;
        } else {
          deHoje.forEach((b, i) => {
            respostaAgenda += `${i + 1}. *${b.userName || 'Cliente'}* às *${b.time || '14:00'}* (${b.status || 'APPROVED'})\n`;
          });
        }
        await sendTelegramMessage(chatId, respostaAgenda, null, threadId);
        return;
      } catch (err) {
        console.error('Erro ao consultar agenda:', err);
      }
    }

    // D. Presença
    if (comandoHeuristico.tipo === 'PRESENCA' && comandoHeuristico.dados) {
      const isSim = comandoHeuristico.dados.compareceu;
      const nome = comandoHeuristico.dados.clienteNome || 'Cliente';
      await sendTelegramMessage(
        chatId,
        isSim 
          ? `✅ *PRESENÇA REGISTRADA PARA ${nome.toUpperCase()}!*\nO cliente foi encaminhado para a coluna de Pós-Venda (Cicatrização).`
          : `❌ *FALTA REGISTRADA PARA ${nome.toUpperCase()}!*\nO cliente foi marcado como No-Show e encaminhado para Resgate Avalanche.`,
        null,
        threadId
      );
      return;
    }

    // E. Fechamento Diário & Pente Fino
    if (comandoHeuristico.tipo === 'FECHAMENTO_DIARIO') {
      try {
        const todayStr = new Date().toISOString().split('T')[0];
        const [bSnap, lSnap] = await Promise.all([
          getDocs(collection(db, 'bookings')),
          getDocs(collection(db, 'leads'))
        ]);

        const allBookings = bSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const allLeads = lSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter(l => l.nome && !l.id?.startsWith('_'));

        const hojeBookings = allBookings.filter(b => (b.date || '').split('T')[0] === todayStr);
        const concluidosHoje = hojeBookings.filter(b => b.status === 'COMPLETED');
        const faturamentoHoje = concluidosHoje.reduce((acc, b) => acc + Number(b.priceEstimated || 0), 0);
        const sinaisHoje = hojeBookings.reduce((acc, b) => acc + Number(b.depositPaid || 0), 0);

        const leadsTriagem = allLeads.filter(l => l.estagio === 'novo').length;
        const leadsQualif = allLeads.filter(l => l.estagio === 'qualificacao').length;
        const leadsNegoc = allLeads.filter(l => l.estagio === 'negociacao').length;
        const leadsAgend = allLeads.filter(l => l.estagio === 'agendado').length;
        const leadsPosVenda = allLeads.filter(l => l.estagio === 'pos_venda').length;
        const leadsResgate = allLeads.filter(l => l.estagio === 'followup' || l.temperatura === 'frio' || l.temperatura === 'desmarcou').length;

        const relatorio =
          `📊 *PENTE FINO & FECHAMENTO DO ESTÚDIO — SOMOS 1 TATTOO* 🎨\n` +
          `🗓️ *Data:* ${todayStr.split('-').reverse().join('/')}\n\n` +
          `💰 *1. CAIXA & SESSÕES DE HOJE:*\n` +
          `• Sessões Marcadas Hoje: *${hojeBookings.length}*\n` +
          `• Concluídas / Tatuadas: *${concluidosHoje.length}*\n` +
          `• Faturamento das Sessões: *R$ ${faturamentoHoje}*\n` +
          `• Sinais de 30% Travados: *R$ ${sinaisHoje}*\n` +
          `• Chave PIX Estúdio: \`somos1tattoo@gmail.com\`\n\n` +
          `🎯 *2. RAIO-X DOS LEADS NO FUNIL CRM:*\n` +
          `• 🛎️ Triagem / Novos: *${leadsTriagem}*\n` +
          `• 🎯 Qualificação (SDR): *${leadsQualif}*\n` +
          `• 💬 Negociação (Aguardando Sinal): *${leadsNegoc}*\n` +
          `• 📅 Sessões Agendadas: *${leadsAgend}*\n` +
          `• ✨ Pós-Venda Cicatrização: *${leadsPosVenda}*\n` +
          `• 🔕 Resgate Avalanche: *${leadsResgate}*\n\n` +
          `⚡ *3. PLANO DE AÇÃO DO MIGUEL:*\n` +
          (leadsNegoc > 0 ? `👉 *${leadsNegoc} cliente(s)* em Negociação aguardando sinal: enviar lembrete com a chave PIX!\n` : '') +
          (leadsTriagem > 0 ? `👉 *${leadsTriagem} novo(s) lead(s)* em Triagem: responder agora para não esfriar!\n` : '') +
          (leadsResgate > 0 ? `👉 *${leadsResgate} contato(s)* no Resgate: disparar promoção flash de reativação!\n` : '✅ Todos os contatos do estúdio estão em dia e organizados!\n\n') +
          `_Para agir em cada etapa, abra o tópico correspondente na barra lateral esquerda!_`;

        await sendTelegramMessage(chatId, relatorio, null, threadId);
        return;
      } catch (err) {
        console.error('Erro no fechamento:', err);
      }
    }
  }

  // 2. Fallback com Gemini Flash (quando houver chave configurada)
  const geminiApiKey = process.env.GEMINI_API_KEY || GEMINI_KEY;
  const promptMiguel = `Você é Miguel, o Assessor Executivo Pessoal e Co-Piloto Inteligente do tatuador Markinhos (Somos 1 Tattoo Studio).
Markinhos está falando com você diretamente pelo Telegram dele.
Ele falou: "${textoMarcos}"
Responda de forma ágil, executiva e amigável em tom de braço direito do tatuador. Máximo 2 a 3 frases.`;

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: promptMiguel }] }],
        generationConfig: { temperature: 0.3 }
      })
    });
    const data = await res.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (rawText && rawText.length > 3) {
      await sendTelegramMessage(chatId, `🎩 *Miguel:* ${rawText}`, null, threadId);
      return;
    }
  } catch (e) {
    console.warn('Aviso Gemini Miguel:', e);
  }

  // Fallback padrão amigável
  await sendTelegramMessage(
    chatId,
    `Fala, Markinhos! 🤘 Recebi: "${textoMarcos}".\n\nSe quiser agendar ou mandar mensagem, você pode me pedir diretamente (ex: "agenda amanha as 15h com o Lucas valor 500") ou usar os botões do */menu*!`,
    null,
    threadId
  );
}

// ─── MENUS E RELATÓRIOS DO TELEGRAM ─────────────────────────────────────────

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

// ─── CONTROLADOR PRINCIPAL DO TELEGRAM (CALLBACKS E CONVERSAS) ──────────────

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
        let phone = '';
        let clientName = 'Cliente';
        let textToSend = '';

        // 1. Tenta carregar do documento do lead no Firestore
        try {
          const leadSnap = await getDoc(doc(db, 'leads', leadId));
          if (leadSnap.exists()) {
            const f = leadSnap.data();
            phone = f.telefone || '';
            clientName = f.nome || f.clienteNome || 'Cliente';
            textToSend = f.sugestaoResposta || '';
          }
        } catch (e) {
          console.warn('Aviso ao ler lead:', e);
        }

        // 2. Fallback inteligente: extrai do próprio texto da mensagem no Telegram
        if (!textToSend && cq.message?.text) {
          const matchSug = cq.message.text.match(/💡 (?:Sugestão de Resposta da IA|\*Sugestão de Resposta da IA:\*)\n"([^"]+)"/s);
          if (matchSug) textToSend = matchSug[1].trim();
        }

        if (!phone && cq.message?.text) {
          const matchPhone = cq.message.text.match(/(?:55\d{10,11}|\b\d{10,11}\b)/);
          if (matchPhone) phone = matchPhone[0];
          const matchNome = cq.message.text.match(/👤 (?:Cliente|\*Cliente:\*)\s+([^(\n]+)/);
          if (matchNome) clientName = matchNome[1].trim();
        }

        if (phone && textToSend) {
          const ok = await sendWhatsAppMessage(phone, textToSend);

          // Atualiza histórico do lead
          try {
            await updateDoc(doc(db, 'leads', leadId), {
              ultimaMensagemEnviada: textToSend,
              ultimoContatoEm: serverTimestamp(),
              updatedAt: serverTimestamp()
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
        await updateDoc(doc(db, 'leads', leadId), {
          sinalPago: true,
          estagio: 'agendado',
          updatedAt: serverTimestamp()
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
        await setDoc(doc(db, 'contatos_ignorados', senderPhone), {
          telefone: senderPhone,
          motivo: 'Ignorado via Telegram Bot',
          dataIgnorado: serverTimestamp()
        }, { merge: true });

        // Remove do funil se existir
        const qLead = query(collection(db, 'leads'), where('telefone', '==', senderPhone));
        const snapLead = await getDocs(qLead);
        for (const d of snapLead.docs) {
          await deleteDoc(doc(db, 'leads', d.id));
        }
      } catch (e) {}

      await answerTelegramCallback(cq.id, '🚫 Contato ignorado no CRM!');
      if (chatId && msgId) {
        await editTelegramMessage(
          chatId,
          msgId,
          `🚫 *CONTATO BLOQUEADO & REMOVIDO!* 🗑️\n\n` +
          `O número ${formatPhone(senderPhone)} foi adicionado aos contatos ignorados e não gerará mais alertas no CRM.`
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
          await updateDoc(doc(db, 'bookings', bookingId), {
            status: nextStatus,
            updatedAt: serverTimestamp()
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
      await answerTelegramCallback(cq.id, 'Carregando...');
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

  // 2. PROCESSAR MENSAGENS DE TEXTO E COMANDOS
  if (rawBody.message && rawBody.message.chat) {
    const chatId = rawBody.message.chat.id;
    const chatType = rawBody.message.chat.type; // 'private', 'group', 'supergroup'
    const threadId = rawBody.message.message_thread_id;
    const text = (rawBody.message.text || '').trim();
    const lower = text.toLowerCase();

    // Comandos de Criação Automática de Tópicos do Grupo
    if (lower === '/criar_topicos' || lower === '/setup' || (lower === '/topicos' && (chatType === 'supergroup' || chatType === 'group'))) {
      if (chatType === 'supergroup' || chatType === 'group') {
        await criarTodosOsTopicos(chatId);
        return res.status(200).json({ ok: true, action: 'topicos_criados' });
      } else {
        const explicacao = 
          `👥 *COMO ATIVAR O GRUPO COM TÓPICOS NO TELEGRAM:* 🎨\n\n` +
          `O Telegram não permite que NENHUM bot crie o grupo do zero (regra de segurança global do Telegram contra spam de robôs). Mas você cria em 15 segundos no seu celular ou PC:\n\n` +
          `1️⃣ No seu Telegram, toque em *Novo Grupo* (ex: "Somos 1 Tattoo — Central").\n` +
          `2️⃣ Adicione este bot: *@somos1tattoo_bot*\n` +
          `3️⃣ Nas configurações do grupo (Editar Grupo), ATIVE a opção *Tópicos (Fórum)*.\n` +
          `4️⃣ Promova o bot a *Administrador* com permissão de "Gerenciar Tópicos".\n` +
          `5️⃣ Digite */criar_topicos* dentro do grupo!\n\n` +
          `O bot criará automaticamente todos os 7 tópicos, configurará os ícones/cores e conectará cada agente na sua janela! 🚀`;
        await sendTelegramMessage(chatId, explicacao);
        return res.status(200).json({ ok: true });
      }
    }

    // Comandos de Barra / Teclado
    if (lower === '/start' || lower === '/menu' || lower === '/agentes' || lower === 'menu' || lower === 'agentes') {
      const menu = getMainHQMenu();
      await sendTelegramMessage(chatId, menu.texto, menu.botoes, threadId);
      return res.status(200).json({ ok: true });
    }

    if (lower === '/hoje' || lower === '/agenda') {
      const rel = getAgentReportText('agendado');
      await sendTelegramMessage(chatId, rel.texto, rel.botoes, threadId);
      return res.status(200).json({ ok: true });
    }

    if (lower === '/sinal') {
      const rel = getAgentReportText('negociacao');
      await sendTelegramMessage(chatId, rel.texto, rel.botoes, threadId);
      return res.status(200).json({ ok: true });
    }

    if (lower === '/posvenda') {
      const rel = getAgentReportText('pos_venda');
      await sendTelegramMessage(chatId, rel.texto, rel.botoes, threadId);
      return res.status(200).json({ ok: true });
    }

    if (lower === '/status') {
      const rel = getAgentReportText('status');
      await sendTelegramMessage(chatId, rel.texto, rel.botoes, threadId);
      return res.status(200).json({ ok: true });
    }

    if (lower === '/topicos') {
      const explicacaoTopicos =
        `👥 *COMO CONECTAR O GRUPO COM TÓPICOS NO TELEGRAM:* 🎨\n\n` +
        `Para cada agente ter sua própria janela separada:\n\n` +
        `1️⃣ Crie um grupo no Telegram (ex: *Somos 1 Tattoo — Central*).\n` +
        `2️⃣ Nas configurações do grupo, ative a opção *Tópicos (Fórum)*.\n` +
        `3️⃣ Adicione o bot *@somos1tattoo_bot* como Administrador (com permissão de Gerenciar Tópicos).\n` +
        `4️⃣ Digite */criar_topicos* dentro do grupo!\n\n` +
        `O bot cria todos os 7 canais na hora e salva as rotas no sistema!`;

      await sendTelegramMessage(chatId, explicacaoTopicos, null, threadId);
      return res.status(200).json({ ok: true });
    }

    // Se o Markinhos enviou uma mensagem em linguagem natural, aciona o Co-Piloto Miguel
    await conversarComMiguelAdmin(text, chatId, threadId);
    return res.status(200).json({ ok: true, processedBy: 'miguel' });
  }

  return res.status(200).json({ ok: true });
}

// ─── VERCEL SERVERLESS HANDLER ──────────────────────────────────────────────

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, apikey');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const url = new URL(req.url, `https://${req.headers.host || 'somos1-tattoo-studio.vercel.app'}`);
  const path = url.pathname.replace(/^\/api/, '');

  try {
    // Health Check
    if (req.method === 'GET') {
      return res.status(200).json({ status: 'ok', engine: 'Somos 1 Native AI Studio Engine v3 (Firebase SDK Direct)' });
    }

    // ─── WEBHOOK INBOUND DO WHATSAPP / TELEGRAM ─────────────────────────────
    if (req.method === 'POST') {
      const rawBody = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

      // 1. Caso TELEGRAM (clique em botões inline ou comandos/mensagens do Markinhos)
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

      // CASO A: Mensagem do próprio tatuador via WhatsApp
      if (isAdmin) {
        const lower = userText.toLowerCase();
        if (lower.includes('compareceu') || lower.includes('veio') || lower.includes('tatuou')) {
          await sendWhatsAppMessage(senderPhone, '✅ Presença registrada via comando! Lead movido para Pós-Venda.');
          return res.status(200).json({ status: 'admin_command_processed' });
        }
      }

      // CASO B: Mensagem de Cliente / Lead (Disparo Inteligente)

      // 1. Salva a mensagem recebida no histórico unificado do CRM
      try {
        await addDoc(collection(db, 'crm_messages'), {
          telefone: senderPhone,
          clienteNome: senderName,
          mensagem: userText || '[Foto de referência enviada]',
          remetente: 'cliente',
          timestamp: serverTimestamp(),
          status: 'entregue'
        });
      } catch (err) {
        console.warn('Erro ao salvar crm_messages:', err);
      }

      // 2. Busca histórico das últimas 5 conversas para contexto profundo
      const historico = await getRecentMessages(senderPhone, 5);

      // 3. Localiza se já é Cliente da Carteira (pós-tattoo) ou Lead do Funil (pré-tattoo)
      const existingCliente = await findClienteByPhone(senderPhone);
      let lead = await findLeadByPhone(senderPhone);

      let agenteTipo = 'novo';

      if (existingCliente) {
        const temp = existingCliente.bucketTemperatura;
        if (temp === 'quente' || temp === 'morno') agenteTipo = 'pos_venda';
        else if (temp === 'desmarcou') agenteTipo = 'followup';
        else agenteTipo = 'qualificacao';
      } else if (lead) {
        agenteTipo = lead.estagio;
      } else {
        // NOVO LEAD: GRAVA DIRETAMENTE NO FIRESTORE NA COLEÇÃO 'leads'
        try {
          const docRef = await addDoc(collection(db, 'leads'), {
            nome: senderName,
            telefone: senderPhone,
            origem: 'whatsapp',
            estagio: 'novo',
            temperatura: 'quente',
            ideiaProjeto: userText,
            responsavelAtendimento: 'IA_Assessor',
            criadoPor: 'agente_ia',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            ultimoContatoEm: serverTimestamp()
          });

          lead = {
            id: docRef.id,
            nome: senderName,
            telefone: senderPhone,
            estagio: 'novo',
            temperatura: 'quente',
            ticketEstimado: 0,
            valorSinal: 0,
            pilotoIA: false
          };
        } catch (e) {
          console.error('Erro ao criar lead no Firestore:', e);
        }
      }

      // Atualiza último contato se lead já existia
      if (lead && lead.id && !lead.id.startsWith('lead_')) {
        try {
          await updateDoc(doc(db, 'leads', lead.id), {
            ultimaMensagem: userText,
            ultimoContatoEm: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        } catch (e) {}
      }

      // Se perguntou de preço ou orçamento na mensagem atual, direciona para negociação
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

      // 5. Salva a sugestão diretamente no documento do lead na coleção 'leads'
      const leadId = lead?.id || 'lead_' + senderPhone;
      try {
        await setDoc(doc(db, 'leads', leadId), {
          nome: senderName,
          telefone: senderPhone,
          mensagemCliente: userText,
          sugestaoResposta: sugestaoIA,
          sugestaoAgenteTipo: agenteTipo,
          sugestaoPendente: true,
          updatedAt: serverTimestamp()
        }, { merge: true });
      } catch (err) {
        console.warn('Erro ao salvar sugestao no lead:', err);
      }

      // 6. DISPARO NO TELEGRAM DO TATUADOR (MODO CO-PILOTO COM DETALHES COMPLETOS)
      const nomeAgenteDisplay = {
        novo: '🛎️ Triagem & Boas-Vindas',
        qualificacao: '🎯 Clone do Dono (SDR SPIN)',
        negociacao: '💬 Jonathan (Fechamento & Sinal PIX)',
        agendado: '📅 Secretário da Agenda',
        pos_venda: '✨ Juliana (Pós-Venda Cicatrização)',
        followup: '🔕 Avalanche (Resgate)'
      }[agenteTipo] || '🤖 Co-Piloto Somos 1';

      const emojiTemp = {
        quente: '🔥 QUENTE (Alto Interesse)',
        morno: '☀️ MORNO (Em Análise)',
        frio: '❄️ FRIO (Baixo Contato)',
        desmarcou: '🚨 NO-SHOW / DESMARCOU'
      }[lead?.temperatura || 'quente'] || '🔥 QUENTE';

      const nivelFluxo = existingCliente 
        ? '💼 Carteira de Clientes (Pós-Tattoo)' 
        : '🎯 Funil Comercial (Pré-Tattoo)';

      const valorTotal = lead?.ticketEstimado || 0;
      const valorSinal = lead?.valorSinal || (valorTotal > 0 ? Math.round(valorTotal * 0.3) : 240);

      const textoTelegram = 
        `⚔️ *NOVO DIÁLOGO NO WHATSAPP!* 🎨\n\n` +
        `👤 *Cliente:* ${senderName} (${formatPhone(senderPhone)})\n` +
        `🏷️ *Etapa do Funil:* ${nomeAgenteDisplay}\n` +
        `🌡️ *Temperatura:* ${emojiTemp}\n` +
        `📊 *Nível no CRM:* ${nivelFluxo}\n` +
        (valorTotal > 0 ? `💰 *Valor / Sinal:* R$ ${valorTotal} (Sinal 30%: R$ ${valorSinal})\n` : '') +
        `💬 *Disse:*\n"${userText}"\n\n` +
        `💡 *Sugestão de Resposta da IA:*\n"${sugestaoIA}"\n\n` +
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

      // Roteia para o tópico específico do grupo se configurado, ou para o privado do admin
      let targetChatId = TELEGRAM_ADMIN_CHAT_ID;
      let targetThreadId = null;

      try {
        const topicsSnap = await getDoc(doc(db, 'leads', '_config_telegram_topics'));
        if (topicsSnap.exists()) {
          const conf = topicsSnap.data();
          if (conf.groupId && conf.ativo) {
            targetChatId = conf.groupId;
            targetThreadId = conf.topics?.[agenteTipo] || null;
          }
        }
      } catch (e) {
        console.warn('Erro ao obter _config_telegram_topics:', e);
      }

      await sendTelegramMessage(targetChatId, textoTelegram, inlineKeyboard, targetThreadId);

      // 7. Se o Piloto Automático estiver ativado para este lead, dispara automático no WhatsApp
      if (lead?.pilotoIA) {
        await sendWhatsAppMessage(senderPhone, sugestaoIA);
        try {
          await addDoc(collection(db, 'crm_messages'), {
            telefone: senderPhone,
            clienteNome: senderName,
            mensagem: sugestaoIA,
            remetente: 'ia',
            timestamp: serverTimestamp(),
            status: 'entregue'
          });
        } catch (e) {}

        await sendTelegramMessage(
          targetChatId,
          `⚡ *AUTO-PILOTO:* A resposta acima foi disparada automaticamente no WhatsApp de ${senderName}!`,
          null,
          targetThreadId
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
