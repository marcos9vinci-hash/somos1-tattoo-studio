/**
 * n8nWorkflowTemplates.ts
 * 
 * Estrutura e snippets prontos para uso no n8n para a Central Multi-Agente do WhatsApp.
 * Inclui:
 * 1. O código JavaScript exato do nó n8n ("Code Node") para classificação de texto e áudio
 * 2. O esquema de roteamento dos Especialistas (Clone do Dono, Jonathan, Juliana Ops, etc.)
 */

export const N8N_INTENT_CODE_NODE_SNIPPET = `
// =========================================================================
// NÓ CODE DO n8n: CLASSIFICADOR DE INTENÇÃO DO TATUADOR (MARQUINHOS)
// Suporta: 1, 2, "sim", "não", "pode mandar", "não manda nada", áudios transcritos
// =========================================================================

const item = $input.item.json;

// 1. Obtém o texto da mensagem (ou a transcrição do áudio via Whisper)
let rawText = '';

if (item.transcribedAudioText) {
  rawText = item.transcribedAudioText;
} else if (item.body?.text) {
  rawText = item.body.text;
} else if (item.message?.conversation) {
  rawText = item.message.conversation;
} else if (item.message?.extendedTextMessage?.text) {
  rawText = item.message.extendedTextMessage.text;
} else {
  rawText = item.text || '';
}

const clean = (rawText || '').trim();
const normalized = clean
  .normalize('NFD')
  .replace(/[\\u0300-\\u036f]/g, '')
  .toLowerCase();

// Padrões de Rejeição / Silenciamento (Prioritário por segurança)
const REJECT_REGEX = /^(2|n|nao|não|nao manda|não manda|nao manda nada|não manda nada|para|cancela|cancelar|deixa comigo|eu assumo|eu respondo|faltou|nao veio|não veio|furou|no show|noshow)$/i;

// Padrões de Aprovação / Envio / Confirmação de Presença
const APPROVE_REGEX = /^(1|s|sim|ss|positivo|pode|pode mandar|pode enviar|manda|mande|manda bala|manda ver|envia|autorizado|aprovo|aprovado|veio|ele veio|ela veio|compareceu|concluido|concluído|tatuou|feito|fechou|beleza|ok|ta bom|tá bom)$/i;

// Padrões de Reagendamento
const RESCHEDULE_REGEX = /^(3|reagendou|reagendar|remarcar|remarcou|mudou de data|outro dia)$/i;

let intent = 'UNCERTAIN';
let confidence = 0.5;

if (REJECT_REGEX.test(normalized) || normalized.includes('nao manda nada') || normalized.includes('deixa comigo') || normalized.includes('nao veio')) {
  intent = 'REJECT';
  confidence = 0.98;
} else if (RESCHEDULE_REGEX.test(normalized) || normalized.includes('reagendou')) {
  intent = 'RESCHEDULE';
  confidence = 0.95;
} else if (APPROVE_REGEX.test(normalized) || normalized.includes('pode mandar') || normalized.includes('ele veio') || normalized.includes('manda ver')) {
  intent = 'APPROVE';
  confidence = 0.98;
}

return {
  json: {
    ...item,
    rawResponse: clean,
    normalizedResponse: normalized,
    detectedIntent: intent,
    confidence: confidence,
    isVoiceNote: Boolean(item.transcribedAudioText),
    shouldSendToClient: intent === 'APPROVE',
    shouldCancelAction: intent === 'REJECT',
    isReschedule: intent === 'RESCHEDULE',
    isUncertain: intent === 'UNCERTAIN'
  }
};
`;

export const N8N_ESPECIALISTAS_SIGNATURES = {
  triagem: {
    nome: 'Clone do Dono',
    assinatura: '🤖 [Triagem · Clone do Dono]',
    emoji: '🤖'
  },
  orcamento: {
    nome: 'Jonathan Copy',
    assinatura: '💬 [Orçamento · Jonathan]',
    emoji: '💬'
  },
  agenda: {
    nome: 'Agente Agenda',
    assinatura: '📅 [Agenda · Preparação]',
    emoji: '📅'
  },
  checkin: {
    nome: 'Juliana Ops',
    assinatura: '💉 [Check-in · Juliana Ops]',
    emoji: '💉'
  },
  posvenda: {
    nome: 'Juliana Cuidados',
    assinatura: '🌿 [Pós-Venda · Cuidados]',
    emoji: '🌿'
  },
  resgate: {
    nome: 'Agente Avalanche',
    assinatura: '❄️ [Resgate · Avalanche]',
    emoji: '❄️'
  }
};
