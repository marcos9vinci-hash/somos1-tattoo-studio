/**
 * whatsappIntentParser.ts
 * 
 * Processador Inteligente de Intenção do Tatuador (Marquinhos) no WhatsApp
 * Suporta:
 * 1. Dígitos Numéricos (1, 2, 3)
 * 2. Linguagem Natural Coloquial ("pode mandar", "não manda nada", "ele veio", "deixa comigo")
 * 3. Transcrições de Áudio (Áudios enviados na correria do estúdio gravados via WhatsApp)
 */

export type ArtistIntent = 'APPROVE' | 'REJECT' | 'RESCHEDULE' | 'UNCERTAIN';

export interface ParsedIntentResult {
  intent: ArtistIntent;
  confidence: number;
  matchedRule: string;
  normalizedText: string;
  suggestedAction: string;
}

// Dicionário de sinônimos e padrões coloquiais do estúdio
const APPROVAL_PATTERNS = [
  // Numéricos
  /^1$/,
  /\b1\b/,
  // Afirmações diretas
  /\bsim\b/i,
  /\bs\b/i,
  /\bss\b/i,
  /\bcom certeza\b/i,
  /\bpositivo\b/i,
  /\bexato\b/i,
  /\bfechou\b/i,
  /\bfechado\b/i,
  /\bfeito\b/i,
  /\bshow\b/i,
  /\bbeleza\b/i,
  /\bok\b/i,
  /\btá bom\b/i,
  /\bta bom\b/i,
  /\btudo certo\b/i,
  // Comandos de envio / autorização
  /\bpode mandar\b/i,
  /\bpode enviar\b/i,
  /\bpode disparar\b/i,
  /\bpode sim\b/i,
  /\bmanda\b/i,
  /\bmande\b/i,
  /\bmanda bala\b/i,
  /\bmanda ver\b/i,
  /\benvia\b/i,
  /\benvie\b/i,
  /\bautorizado\b/i,
  /\baprovo\b/i,
  /\baprovado\b/i,
  /\blibera\b/i,
  /\bliberado\b/i,
  // Confirmações de presença (Check-in de Conclusão / Juliana Ops)
  /\bveio\b/i,
  /\bele veio\b/i,
  /\bela veio\b/i,
  /\bcompareceu\b/i,
  /\btatuou\b/i,
  /\bta feito\b/i,
  /\btá feito\b/i,
  /\bja terminou\b/i,
  /\bjá terminou\b/i,
  /\bterminou\b/i,
  /\bconcluido\b/i,
  /\bconcluído\b/i,
  /\brealizado\b/i
];

const REJECTION_PATTERNS = [
  // Numéricos
  /^2$/,
  /\b2\b/,
  // Negações diretas
  /\bn[aã]o\b/i,
  /\bnn\b/i,
  /\bnegativo\b/i,
  /\bnunca\b/i,
  // Bloqueio de envio
  /\bn[aã]o manda\b/i,
  /\bn[aã]o manda nada\b/i,
  /\bn[aã]o envia\b/i,
  /\bnao envia nada\b/i,
  /\bpara\b/i,
  /\bcancela\b/i,
  /\bcancelar\b/i,
  /\bsegura\b/i,
  /\bespera\b/i,
  /\bdeixa quieto\b/i,
  /\bn[aã]o precisa\b/i,
  // O Marquinhos assume pessoalmente
  /\bdeixa comigo\b/i,
  /\beu assumo\b/i,
  /\beu respondo\b/i,
  /\beu falo com ele\b/i,
  /\beu falo com ela\b/i,
  /\beu mando\b/i,
  /\beu mesmo mando\b/i,
  // Falta de comparecimento (No-Show / Check-in)
  /\bfaltou\b/i,
  /\bn[aã]o veio\b/i,
  /\bnao apareceu\b/i,
  /\bn[aã]o apareceu\b/i,
  /\bfurou\b/i,
  /\bdesistiu\b/i,
  /\bno show\b/i,
  /\bnoshow\b/i
];

const RESCHEDULE_PATTERNS = [
  // Numéricos
  /^3$/,
  /\b3\b/,
  /\breagendou\b/i,
  /\breagendar\b/i,
  /\bremarca\b/i,
  /\bremarcou\b/i,
  /\bvai remarcar\b/i,
  /\bmudou de data\b/i,
  /\bmudou o dia\b/i,
  /\boutro dia\b/i
];

/**
 * Remove acentuação e normaliza caracteres para análise resiliente
 */
export function normalizeStudioText(input: string): string {
  if (!input) return '';
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

/**
 * Classifica a intenção de uma mensagem de texto ou transcrição de áudio do Marquinhos
 */
export function parseArtistWhatsAppIntent(rawMessage: string): ParsedIntentResult {
  if (!rawMessage || typeof rawMessage !== 'string') {
    return {
      intent: 'UNCERTAIN',
      confidence: 0,
      matchedRule: 'empty_input',
      normalizedText: '',
      suggestedAction: 'Pedir confirmação clara (1 ou 2).'
    };
  }

  const clean = rawMessage.trim();
  const normalized = normalizeStudioText(clean);

  // 1. Checagem prioritária de REJEIÇÃO / "NÃO MANDA NADA"
  // Regra de segurança: se tiver negação explícita ou "deixa comigo", nunca envia
  for (const pattern of REJECTION_PATTERNS) {
    if (pattern.test(clean) || pattern.test(normalized)) {
      return {
        intent: 'REJECT',
        confidence: 0.95,
        matchedRule: pattern.toString(),
        normalizedText: normalized,
        suggestedAction: 'Silenciar robô e NÃO disparar mensagem ao cliente. Deixar com o tatuador.'
      };
    }
  }

  // 2. Checagem de REAGENDAMENTO
  for (const pattern of RESCHEDULE_PATTERNS) {
    if (pattern.test(clean) || pattern.test(normalized)) {
      return {
        intent: 'RESCHEDULE',
        confidence: 0.95,
        matchedRule: pattern.toString(),
        normalizedText: normalized,
        suggestedAction: 'Mover card para Reagendado no CRM e abrir calendário.'
      };
    }
  }

  // 3. Checagem de APROVAÇÃO / "PODE MANDAR" / "VEIO"
  for (const pattern of APPROVAL_PATTERNS) {
    if (pattern.test(clean) || pattern.test(normalized)) {
      return {
        intent: 'APPROVE',
        confidence: 0.95,
        matchedRule: pattern.toString(),
        normalizedText: normalized,
        suggestedAction: 'Aprovar ação: disparar mensagem ao cliente ou confirmar conclusão da sessão.'
      };
    }
  }

  // 4. Caso Incerteza / Frase ambígua
  return {
    intent: 'UNCERTAIN',
    confidence: 0.3,
    matchedRule: 'no_match',
    normalizedText: normalized,
    suggestedAction: 'Perguntar no Zap: "Marquinhos, entendi que você disse: \\"' + clean + '\\". Pode confirmar com 1 (Sim) ou 2 (Não)?"'
  };
}
