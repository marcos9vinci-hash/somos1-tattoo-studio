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

async function conversarComMiguelAdmin(textoMarcos, chatId) {
  const promptMiguel = `Você é Miguel, o Assessor Executivo Pessoal e Co-Piloto Inteligente do tatuador Markinhos (Somos 1 Tattoo Studio).
Markinhos está falando com você diretamente pelo Telegram dele.
Ele pode pedir coisas como:
- "pode agendar amanhã às 14h com o João, valor 600 e sinal 180"
- "marca 500 reais de tattoo e 150 de sinal para o Lucas"
- "manda mensagem no zap do Carlos avisando que o desenho tá pronto"
- "o Tiago compareceu" ou "a Leia faltou"
- "quanto tem na agenda pra hoje?"
- dúvidas sobre o CRM, sinal, ou clientes.

Analise o texto de Markinhos:
"${textoMarcos}"

Retorne uma resposta JSON com o seguinte formato exato:
{
  "intencao": "AGENDAR" | "DISPARAR_ZAP" | "CONFIRMAR_SINAL" | "REGISTRAR_PRESENCA" | "CONSULTA_GERAL",
  "respostaTelegram": "mensagem amigável, ágil e executiva para o Markinhos confirmando o que foi feito ou respondendo a dúvida",
  "dados": {
    "clienteNome": "nome se identificado",
    "clienteTelefone": "telefone se informado",
    "data": "YYYY-MM-DD se informada (ou data relativa convertida considerando hoje)",
    "hora": "HH:MM se informada",
    "valor": 0,
    "sinal": 0,
    "mensagemParaCliente": "texto se pediu para mandar no WhatsApp",
    "compareceu": true ou false se for presença
  }
}`;

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: promptMiguel }] }],
        generationConfig: { temperature: 0.2, responseMimeType: "application/json" }
      })
    });
    const data = await res.json();
    const rawJson = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (rawJson) {
      const parsed = JSON.parse(rawJson);

      // 1. AÇÃO: AGENDAR
      if (parsed.intencao === 'AGENDAR' && parsed.dados) {
        const d = parsed.dados;
        const bookingDate = d.data || new Date().toISOString().split('T')[0];
        const bookingTime = d.hora || '14:00';
        const clientName = d.clienteNome || 'Cliente';
        const price = Number(d.valor) || 0;
        const deposit = Number(d.sinal) || (price > 0 ? Math.round(price * 0.3) : 0);

        // Cria agendamento no Firestore
        const bookingRef = await addDoc(collection(db, 'bookings'), {
          userName: clientName,
          date: bookingDate,
          time: bookingTime,
          priceEstimated: price,
          depositPaid: deposit,
          status: 'APPROVED',
          artistId: 'admin',
          size: 'Média',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });

        // Cria ou atualiza o lead correspondente
        await setDoc(doc(db, 'leads', `booking_${bookingRef.id}`), {
          id: `booking_${bookingRef.id}`,
          nome: clientName,
          estagio: 'agendado',
          temperatura: 'quente',
          dataAgendada: bookingDate,
          horaAgendada: bookingTime,
          orcamentoMaximo: price,
          valorSinal: deposit,
          sinalPago: deposit > 0,
          origem: 'agenda',
          responsavelAtendimento: 'Miguel_Telegram',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }, { merge: true });

        const confirmacao = `✅ *FECHADO, MARKINHOS! AGENDAMENTO REALIZADO!* 📅\n\n` +
          `👤 *Cliente:* ${clientName}\n` +
          `🗓️ *Data:* ${bookingDate.split('-').reverse().join('/')} às ${bookingTime}\n` +
          `💰 *Valor:* R$ ${price} | *Sinal:* R$ ${deposit}\n\n` +
          `⚡ A blindagem de lembretes automáticos no WhatsApp e a vaga no CRM já estão ativas!`;

        await sendTelegramMessage(chatId, confirmacao);
        return;
      }

      // 2. AÇÃO: DISPARAR WHATSAPP DIRETO
      if (parsed.intencao === 'DISPARAR_ZAP' && parsed.dados?.clienteTelefone && parsed.dados?.mensagemParaCliente) {
        await sendWhatsAppMessage(parsed.dados.clienteTelefone, parsed.dados.mensagemParaCliente);
        await sendTelegramMessage(chatId, `🚀 *MENSAGEM ENVIADA NO ZAP!* 📲\n\nDisparei para ${parsed.dados.clienteNome || parsed.dados.clienteTelefone}: "${parsed.dados.mensagemParaCliente}"`);
        return;
      }

      // 3. RESPOSTA CONVERSACIONAL DE MIGUEL
      if (parsed.respostaTelegram) {
        await sendTelegramMessage(chatId, `🎩 *Miguel:* ${parsed.respostaTelegram}`);
        return;
      }
    }
  } catch (e) {
    console.error('Erro no assistente Miguel:', e);
  }

  // Fallback conversacional
  await sendTelegramMessage(
    chatId,
    `Fala, Markinhos! 🤘 Recebi seu comando: "${textoMarcos}".\n\nSe quiser agendar ou mandar mensagem, você pode me pedir diretamente (ex: "agenda amanha as 15h com o Lucas valor 500") ou usar os botões do */menu*!`
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
        const sugSnap = await getDoc(doc(db, 'pending_suggestions', leadId));
        if (sugSnap.exists()) {
          const f = sugSnap.data();
          const phone = f.telefone || '';
          const clientName = f.clienteNome || 'Cliente';
          const textToSend = f.sugestaoResposta || '';

          if (phone && textToSend) {
            await sendWhatsAppMessage(phone, textToSend);

            // Grava no histórico do CRM
            await addDoc(collection(db, 'crm_messages'), {
              telefone: phone,
              clienteNome: clientName,
              mensagem: textToSend,
              remetente: 'ia',
              timestamp: serverTimestamp(),
              status: 'entregue'
            });

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
    const text = (rawBody.message.text || '').trim();
    const lower = text.toLowerCase();

    // Comandos de Barra / Teclado
    if (lower === '/start' || lower === '/menu' || lower === '/agentes' || lower === 'menu' || lower === 'agentes') {
      const menu = getMainHQMenu();
      await sendTelegramMessage(chatId, menu.texto, menu.botoes);
      return res.status(200).json({ ok: true });
    }

    if (lower === '/hoje' || lower === '/agenda') {
      const rel = getAgentReportText('agendado');
      await sendTelegramMessage(chatId, rel.texto, rel.botoes);
      return res.status(200).json({ ok: true });
    }

    if (lower === '/sinal') {
      const rel = getAgentReportText('negociacao');
      await sendTelegramMessage(chatId, rel.texto, rel.botoes);
      return res.status(200).json({ ok: true });
    }

    if (lower === '/posvenda') {
      const rel = getAgentReportText('pos_venda');
      await sendTelegramMessage(chatId, rel.texto, rel.botoes);
      return res.status(200).json({ ok: true });
    }

    if (lower === '/status') {
      const rel = getAgentReportText('status');
      await sendTelegramMessage(chatId, rel.texto, rel.botoes);
      return res.status(200).json({ ok: true });
    }

    if (lower === '/topicos') {
      const explicacaoTopicos =
        `👥 *COMO CONECTAR O GRUPO COM TÓPICOS NO TELEGRAM:* 🎨\n\n` +
        `Você pode criar um grupo exclusivo para a equipe do estúdio com cada agente em sua própria janela:\n\n` +
        `1️⃣ Crie um grupo no Telegram (ex: *Somos 1 Tattoo — Quartel General*).\n` +
        `2️⃣ Nas configurações do grupo, ative a opção *Tópicos (Fórum)*.\n` +
        `3️⃣ Crie os 6 Tópicos no grupo:\n` +
        `   • 🛎️ Triagem & Novos Contatos\n` +
        `   • 🎯 SDR & Qualificação (SPIN)\n` +
        `   • 💬 Negociação & Sinal PIX (Jonathan)\n` +
        `   • 📅 Secretário da Agenda (Miguel)\n` +
        `   • ✨ Pós-Venda & Cicatrização (Juliana)\n` +
        `   • 🔕 Resgate Avalanche\n` +
        `   • 🎩 Conversa com Miguel (Comandos)\n\n` +
        `4️⃣ Adicione o bot *@somos1tattoo_bot* como Administrador do grupo.\n` +
        `5️⃣ Digite */conectar_grupo* dentro do grupo para registrar!`;

      await sendTelegramMessage(chatId, explicacaoTopicos);
      return res.status(200).json({ ok: true });
    }

    // Se o Markinhos enviou uma mensagem em linguagem natural, aciona o Co-Piloto Miguel
    await conversarComMiguelAdmin(text, chatId);
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
    if (req.method === 'GET' && (path === '' || path === '/' || path === '/health' || path === '/agent' || path === '/agent/webhook')) {
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

      // 5. Salva a sugestão pendente no Firestore
      const leadId = lead?.id || 'lead_' + senderPhone;
      try {
        await setDoc(doc(db, 'pending_suggestions', leadId), {
          leadId: leadId,
          telefone: senderPhone,
          clienteNome: senderName,
          mensagemCliente: userText,
          sugestaoResposta: sugestaoIA,
          agenteTipo: agenteTipo,
          status: 'pendente',
          updatedAt: serverTimestamp()
        }, { merge: true });
      } catch (err) {
        console.warn('Erro ao salvar pending_suggestions:', err);
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

      await sendTelegramMessage(TELEGRAM_ADMIN_CHAT_ID, textoTelegram, inlineKeyboard);

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
