// Service de Análise Inteligente de Recibos e Comprovantes PIX com IA
// Inspirado e portado da arquitetura do Financeiro IA com motor Google Gemini Vision

export interface ReceiptAnalysisResult {
  sucesso: boolean;
  tipo: 'entrada' | 'saida';
  valor: number;
  valorFormatado: string;
  data: string; // YYYY-MM-DD
  hora?: string; // HH:MM
  pagador?: string;
  pagadorDocumento?: string;
  favorecido?: string;
  favorecidoDocumento?: string;
  favorecidoChavePix?: string;
  banco?: string;
  idTransacao?: string; // Código de autenticação PIX / E2E
  categoriaSugerida: 'sinal_tattoo' | 'procedimento_completo' | 'material' | 'aluguel' | 'comissao' | 'outros';
  descricaoSugerida: string;
  confianca: number; // 0.0 a 1.0
  erro?: string;
  rawText?: string;
}

const SYSTEM_PROMPT = `Você é um auditor financeiro e especialista em conciliação bancária de comprovantes PIX e recibos para o estúdio Somos 1 Tattoo Studio.
Analise a imagem deste comprovante com atenção minuciosa aos detalhes.

Extraia as seguintes informações em JSON com a exata estrutura:
{
  "sucesso": true,
  "tipo": "entrada", // "entrada" se o estúdio/tatuador recebeu, "saida" se o estúdio pagou
  "valor": 150.00, // apenas número decimal com ponto
  "valorFormatado": "R$ 150,00",
  "data": "AAAA-MM-DD", // data do pagamento
  "hora": "HH:MM", // horário se visível
  "pagador": "Nome completo de quem pagou",
  "pagadorDocumento": "CPF/CNPJ parcial se visível",
  "favorecido": "Nome de quem recebeu (Somos 1, Tatuador ou Fornecedor)",
  "favorecidoChavePix": "Chave PIX se visível",
  "banco": "Nome da Instituição Financeira (ex: Nubank, Inter, Itaú, Bradesco, Mercado Pago, Santander, Caixa, C6)",
  "idTransacao": "Código de autenticação ou ID da transação PIX (E2E...)",
  "categoriaSugerida": "sinal_tattoo", // ou "procedimento_completo", "material", "aluguel", "outros"
  "descricaoSugerida": "Sinal de reserva de tatuagem",
  "confianca": 0.95
}

Regras:
1. Priorize detectar se é um pagamento de cliente (entrada/sinal) ou despesa de fornecedor (saída).
2. Se o favorecido for Somos 1 Tattoo, Marcos Vinicius ou o estúdio, marque "tipo": "entrada" e "categoriaSugerida": "sinal_tattoo".
3. Se o comprovante tiver múltiplos valores (ex: taxa, saldo), selecione o VALOR TOTAL DA TRANSFERÊNCIA.
4. Responda APENAS o JSON puro, sem markdown, sem explicações.`;

function getApiKey(): string {
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      if (import.meta.env.VITE_GEMINI_API_KEY) return import.meta.env.VITE_GEMINI_API_KEY;
      if (import.meta.env.VITE_FIREBASE_API_KEY) return import.meta.env.VITE_FIREBASE_API_KEY;
    }
  } catch (e) {}

  try {
    if (typeof process !== 'undefined' && process.env) {
      if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;
      if (process.env.VITE_FIREBASE_API_KEY) return process.env.VITE_FIREBASE_API_KEY;
    }
  } catch (e) {}

  return 'AIzaSyAhIXcG4ReuncxNBZSqjXYOu7Exka_TNo0';
}

/**
 * Análise de imagem do comprovante via Google Gemini Vision
 */
export async function analyzeReceiptImage(
  base64Data: string,
  mimeType: string = 'image/jpeg'
): Promise<ReceiptAnalysisResult> {
  const cleanBase64 = base64Data.includes('base64,') 
    ? base64Data.split('base64,')[1] 
    : base64Data;

  const apiKey = getApiKey();

  // Tentativa 1: Endpoint direto do Gemini Vision (rápido e compatível com browser)
  const candidateModels = [
    'gemini-1.5-flash',
    'gemini-2.0-flash',
    'gemini-2.5-flash'
  ];

  for (const model of candidateModels) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const payload = {
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: SYSTEM_PROMPT
              },
              {
                inline_data: {
                  mime_type: mimeType,
                  data: cleanBase64
                }
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 1024,
          responseMimeType: 'application/json'
        }
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errText = await response.text();
        console.warn(`Gemini Vision (${model}) respondeu com status ${response.status}:`, errText);
        continue;
      }

      const data = await response.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (rawText) {
        const cleaned = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleaned);
        return {
          sucesso: true,
          tipo: parsed.tipo || 'entrada',
          valor: Number(parsed.valor) || 0,
          valorFormatado: parsed.valorFormatado || `R$ ${(Number(parsed.valor) || 0).toFixed(2).replace('.', ',')}`,
          data: parsed.data || new Date().toISOString().split('T')[0],
          hora: parsed.hora || '',
          pagador: parsed.pagador || '',
          pagadorDocumento: parsed.pagadorDocumento || '',
          favorecido: parsed.favorecido || '',
          favorecidoDocumento: parsed.favorecidoDocumento || '',
          favorecidoChavePix: parsed.favorecidoChavePix || '',
          banco: parsed.banco || 'PIX',
          idTransacao: parsed.idTransacao || '',
          categoriaSugerida: parsed.categoriaSugerida || 'sinal_tattoo',
          descricaoSugerida: parsed.descricaoSugerida || 'Sinal PIX recebido',
          confianca: parsed.confianca || 0.9,
          rawText: cleaned
        };
      }
    } catch (err) {
      console.warn(`Erro na tentativa com modelo ${model}:`, err);
    }
  }

  // Fallback se a API falhar: parser heurístico
  return {
    sucesso: false,
    tipo: 'entrada',
    valor: 0,
    valorFormatado: 'R$ 0,00',
    data: new Date().toISOString().split('T')[0],
    categoriaSugerida: 'sinal_tattoo',
    descricaoSugerida: 'Comprovante não processado',
    confianca: 0,
    erro: 'Não foi possível ler o comprovante com a IA. Tente enviar uma imagem mais nítida ou digitar os valores.'
  };
}

/**
 * Análise de texto copiado de comprovante PIX
 */
export async function analyzeReceiptText(rawText: string): Promise<ReceiptAnalysisResult> {
  const apiKey = getApiKey();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  try {
    const payload = {
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `${SYSTEM_PROMPT}\n\nAnalise o seguinte texto copiado de um comprovante:\n\n${rawText}`
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: 'application/json'
      }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleaned);
        return {
          sucesso: true,
          tipo: parsed.tipo || 'entrada',
          valor: Number(parsed.valor) || 0,
          valorFormatado: parsed.valorFormatado || `R$ ${(Number(parsed.valor) || 0).toFixed(2).replace('.', ',')}`,
          data: parsed.data || new Date().toISOString().split('T')[0],
          hora: parsed.hora || '',
          pagador: parsed.pagador || '',
          pagadorDocumento: parsed.pagadorDocumento || '',
          favorecido: parsed.favorecido || '',
          favorecidoChavePix: parsed.favorecidoChavePix || '',
          banco: parsed.banco || 'PIX',
          idTransacao: parsed.idTransacao || '',
          categoriaSugerida: parsed.categoriaSugerida || 'sinal_tattoo',
          descricaoSugerida: parsed.descricaoSugerida || 'Sinal PIX recebido',
          confianca: parsed.confianca || 0.9,
          rawText: cleaned
        };
      }
    }
  } catch (err) {
    console.warn('Erro ao analisar texto com Gemini:', err);
  }

  // Heurística local de contingência para texto
  return extractLocalReceiptFromText(rawText);
}

/**
 * Extrator Heurístico Local (Zero dependência externa)
 */
function extractLocalReceiptFromText(text: string): ReceiptAnalysisResult {
  let valor = 0;
  const matchValor = text.match(/(?:R\$\s*|valor[:\s]*R?\$?\s*)(\d{1,4}(?:[.,]\d{2})?)/i);
  if (matchValor) {
    const rawVal = matchValor[1].replace(',', '.');
    valor = parseFloat(rawVal) || 0;
  }

  let data = new Date().toISOString().split('T')[0];
  const matchData = text.match(/(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{2,4})/);
  if (matchData) {
    const d = matchData[1].padStart(2, '0');
    const m = matchData[2].padStart(2, '0');
    const y = matchData[3].length === 2 ? `20${matchData[3]}` : matchData[3];
    data = `${y}-${m}-${d}`;
  }

  let idTransacao = '';
  const matchId = text.match(/(?:ID|Autenticaç[ãa]o|E2E)[:\s]*([A-Za-z0-9\-_]{15,40})/i);
  if (matchId) {
    idTransacao = matchId[1];
  }

  return {
    sucesso: valor > 0,
    tipo: 'entrada',
    valor,
    valorFormatado: `R$ ${valor.toFixed(2).replace('.', ',')}`,
    data,
    banco: 'PIX',
    idTransacao,
    categoriaSugerida: 'sinal_tattoo',
    descricaoSugerida: 'Sinal de reserva PIX',
    confianca: 0.75,
    rawText: text
  };
}
