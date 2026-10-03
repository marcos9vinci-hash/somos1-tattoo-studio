// @ts-nocheck
import { collection, query, where, getDocs, updateDoc, addDoc, serverTimestamp, doc, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';
import { LeadStage } from '../types/crm';

export interface RawWhatsAppMessage {
  id: string;
  fromMe: boolean;
  senderName?: string;
  text?: string;
  type?: string;
  timestamp?: number;
}

export interface SanitizedTranscript {
  normalizedPhone: string;
  resolvedNameFallback: string;
  condensedHistory: string;
  lastCustomerMessage: string;
}

export interface ScanBatchReport {
  totalChatsLidos: number;
  novosLeadsCapturados: number;
  leadsAtualizados: number;
  ignorados: number;
  contatosIgnorados: number;
  erros: { remoteJid: string; erro: string }[];
}

/**
 * Padrão Chatwoot: Sanitização e Resolução Canônica de Contato
 */
export class ConversationSanitizer {
  static normalizePhone(raw: string): string {
    const cleaned = (raw || '').replace(/\D/g, '');
    if (!cleaned) return '';
    return cleaned.startsWith('55') ? cleaned : `55${cleaned}`;
  }

  static buildContext(
    phone: string,
    pushName: string | undefined,
    messages: RawWhatsAppMessage[] = [],
    maxTurnos = 6
  ): SanitizedTranscript {
    const normalizedPhone = this.normalizePhone(phone);
    const sorted = [...messages].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    const recent = sorted.slice(-maxTurnos);

    let lastCustomerMessage = '';
    const transcriptLines = recent.map((m) => {
      const sender = m.fromMe ? 'Estúdio' : 'Cliente';
      let content = m.text?.trim() || '';
      if (m.type === 'imageMessage' || m.type === 'image') content = '[Foto/Referência anexada]';
      if (m.type === 'audioMessage' || m.type === 'audio') content = '[Áudio enviado]';
      if (m.type === 'stickerMessage' || m.type === 'sticker') content = '[Figurinha]';

      if (!m.fromMe && content) {
        lastCustomerMessage = content;
      }
      return `${sender}: ${content}`;
    });

    return {
      normalizedPhone,
      resolvedNameFallback: pushName?.trim() || 'Cliente WhatsApp',
      condensedHistory: transcriptLines.join('\n'),
      lastCustomerMessage
    };
  }
}

/**
 * Padrão Twenty + Heurística Estúdio: Classificação rápida de Intenção e Temperatura
 */
export class LeadClassifier {
  static classify(text: string): {
    estagio: LeadStage;
    temperatura: 'quente' | 'morno' | 'frio';
    estiloDetectado: string;
    intencaoResumo: string;
  } {
    const lower = (text || '').toLowerCase();
    let estagio: LeadStage = 'novo';
    let temperatura: 'quente' | 'morno' | 'frio' = 'morno';
    let estiloDetectado = 'Não especificado';
    let intencaoResumo = 'Primeiro contato';

    // Detecção de estilo de tatuagem
    if (lower.includes('fineline') || lower.includes('traço fino') || lower.includes('traco fino') || lower.includes('delicado')) {
      estiloDetectado = 'Fineline';
    } else if (lower.includes('realismo') || lower.includes('realista') || lower.includes('retrato')) {
      estiloDetectado = 'Realismo';
    } else if (lower.includes('blackwork') || lower.includes('preto') || lower.includes('sombreado')) {
      estiloDetectado = 'Blackwork';
    } else if (lower.includes('old school') || lower.includes('tradicional')) {
      estiloDetectado = 'Old School';
    } else if (lower.includes('cobertura') || lower.includes('cover up') || lower.includes('reformar')) {
      estiloDetectado = 'Cobertura / Cover-up';
    } else if (lower.includes('piercing')) {
      estiloDetectado = 'Piercing';
    }

    // Detecção de Estágio do Funil Comercial
    if (lower.includes('agendar') || lower.includes('horário') || lower.includes('horario') || lower.includes('marcar') || lower.includes('sinal') || lower.includes('pix')) {
      estagio = 'agendado';
      temperatura = 'quente';
      intencaoResumo = 'Quer marcar horário / pagar sinal';
    } else if (lower.includes('preço') || lower.includes('preco') || lower.includes('valor') || lower.includes('orçamento') || lower.includes('orcamento') || lower.includes('quanto fica')) {
      estagio = 'negociacao';
      temperatura = 'quente';
      intencaoResumo = 'Solicitou orçamento de tatuagem';
    } else if (lower.includes('desenho') || lower.includes('ideia') || lower.includes('tatuar') || lower.includes('foto') || lower.includes('tamanho') || lower.includes('braço') || lower.includes('antebraço')) {
      estagio = 'qualificacao';
      temperatura = 'quente';
      intencaoResumo = 'Enviou referências / alinhando ideia';
    } else if (lower.includes('obrigad') || lower.includes('valeu') || lower.includes('depois vejo') || lower.includes('mês que vem')) {
      estagio = 'followup';
      temperatura = 'morno';
      intencaoResumo = 'Adiou decisão / follow-up';
    } else {
      estagio = 'novo';
      temperatura = 'morno';
      intencaoResumo = 'Interação inicial no WhatsApp';
    }

    return { estagio, temperatura, estiloDetectado, intencaoResumo };
  }
}

/**
 * Executor em Batelada Idempotente (Padrão Twenty Bounded Queue)
 */
export async function executeBatchScan50Chats(
  evolutionBaseUrl: string,
  evolutionApiKey: string,
  instance: string = 'wats'
): Promise<ScanBatchReport> {
  const report: ScanBatchReport = {
    totalChatsLidos: 0,
    novosLeadsCapturados: 0,
    leadsAtualizados: 0,
    ignorados: 0,
    contatosIgnorados: 0,
    erros: []
  };

  if (!evolutionBaseUrl || !evolutionApiKey) {
    throw new Error('Configuração Evolution API ausente em Studio Settings.');
  }

  const cleanBaseUrl = evolutionBaseUrl.replace(/\/$/, '');
  
  // a) Carrega contatos ignorados
  const ignoradosSet = new Set<string>();
  try {
    const ignoradosSnap = await getDocs(collection(db, 'contatos_ignorados'));
    ignoradosSnap.forEach(d => {
      ignoradosSet.add(d.id);
    });
  } catch (err: any) {
    console.warn('Erro ao carregar contatos ignorados:', err);
  }

  const findChatsUrl = `${cleanBaseUrl}/chat/findChats/${instance}`;

  // 1. Busca os últimos 50 chats
  let chats: any[] = [];
  try {
    const res = await fetch(findChatsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': evolutionApiKey
      },
      body: JSON.stringify({ limit: 50 })
    });

    if (!res.ok) {
      // Fallback para GET se o endpoint responder diferente
      const fallbackRes = await fetch(`${cleanBaseUrl}/chat/findChats/${instance}?limit=50`, {
        method: 'GET',
        headers: { 'apikey': evolutionApiKey }
      });
      if (!fallbackRes.ok) throw new Error(`HTTP ${res.status} ao consultar Evolution API`);
      chats = await fallbackRes.json();
    } else {
      chats = await res.json();
    }
  } catch (err: any) {
    throw new Error(`Erro ao conectar na Evolution API para buscar conversas: ${err.message}`);
  }

  if (!Array.isArray(chats) || chats.length === 0) {
    return report;
  }

  const targetChats = chats.slice(0, 50);

  // 2. Fatiamento em chunks de 5 para não sobrecarregar
  const chunkSize = 5;
  for (let i = 0; i < targetChats.length; i += chunkSize) {
    const chunk = targetChats.slice(i, i + chunkSize);

    await Promise.all(chunk.map(async (chat) => {
      report.totalChatsLidos++;
      const remoteJid = chat.id || chat.remoteJid || '';

      // b) Filtra grupos e broadcasts
      if (!remoteJid || 
          remoteJid.includes('@g.us') || 
          remoteJid.includes('@broadcast') || 
          remoteJid.includes('@newsletter') || 
          remoteJid.includes('@lid') || 
          remoteJid.includes('status@')) {
        report.ignorados++;
        return;
      }

      const cleanPhone = ConversationSanitizer.normalizePhone(remoteJid);
      if (!cleanPhone || cleanPhone.length < 10) {
        report.ignorados++;
        return;
      }

      // a) Verifica blacklist
      if (ignoradosSet.has(cleanPhone)) {
        report.contatosIgnorados++;
        return;
      }

      try {
        const pushName = chat.pushName || chat.name || chat.verifiedName || 'Cliente WhatsApp';

        // c) Fetch last 15 messages
        const findMsgsUrl = `${cleanBaseUrl}/chat/findMessages/${instance}`;
        const msgRes = await fetch(findMsgsUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': evolutionApiKey
          },
          body: JSON.stringify({ where: { key: { remoteJid: remoteJid } }, limit: 15 })
        });

        if (!msgRes.ok) {
          throw new Error(`Erro ao buscar mensagens: ${msgRes.status}`);
        }

        const msgsData = await msgRes.json();
        const messages = Array.isArray(msgsData?.messages) ? msgsData.messages : 
                         (Array.isArray(msgsData) ? msgsData : []);
                         
        // d) Only client messages
        const clientMessages = messages
          .map((m: any) => ({
             id: m.key?.id,
             fromMe: m.key?.fromMe,
             text: m.message?.conversation || m.message?.extendedTextMessage?.text || m.message?.imageMessage?.caption || '',
             type: m.messageType || (m.message?.imageMessage ? 'image' : 'text'),
             timestamp: m.messageTimestamp
          }))
          .filter((m: any) => m.fromMe === false);

        // e) 30-day recency filter
        const thirtyDaysAgoSeconds = (Date.now() / 1000) - (30 * 24 * 60 * 60);
        const hasRecent = clientMessages.some((m: any) => (m.timestamp || 0) >= thirtyDaysAgoSeconds);

        if (!hasRecent) {
          report.ignorados++;
          return;
        }

        // f) Use ConversationSanitizer.buildContext() with only client messages
        const context = ConversationSanitizer.buildContext(cleanPhone, pushName, clientMessages);

        // g) Pass lastCustomerMessage to classify
        const classification = LeadClassifier.classify(context.lastCustomerMessage);
        
        const lastText = context.lastCustomerMessage || classification.intencaoResumo;

        // 3. Verificação Canônica no Firestore (Deduplicação Atômica)
        const q = query(collection(db, 'leads'), where('telefone', '==', cleanPhone));
        const snap = await getDocs(q);

        if (!snap.empty) {
          // Atualiza lead existente
          const leadDoc = snap.docs[0];
          const leadData = leadDoc.data();

          const stageOrder: Record<string, number> = {
            'novo': 1, 'qualificacao': 2, 'negociacao': 3, 'agendado': 4, 'concluido': 5, 'pos_venda': 6
          };
          const currentRank = stageOrder[leadData.estagio] || 1;
          const newRank = stageOrder[classification.estagio] || 1;
          const finalStage = newRank > currentRank ? classification.estagio : leadData.estagio;

          const updatePayload: any = {
            ultimoContatoEm: serverTimestamp(),
            updatedAt: serverTimestamp(),
            estagio: finalStage
          };

          if (classification.estiloDetectado !== 'Não especificado' && !leadData.estiloTatuagem) {
            updatePayload.estiloTatuagem = classification.estiloDetectado;
          }

          await updateDoc(doc(db, 'leads', leadDoc.id), updatePayload);
          report.leadsAtualizados++;
        } else {
          // Cria novo lead
          await addDoc(collection(db, 'leads'), {
            nome: pushName,
            telefone: cleanPhone,
            origem: 'whatsapp',
            estagio: classification.estagio,
            temperatura: classification.temperatura,
            estiloTatuagem: classification.estiloDetectado,
            ideiaProjeto: lastText.slice(0, 300) || classification.intencaoResumo,
            responsavelAtendimento: 'IA_Assessor',
            criadoPor: 'agente_ia',
            notasInternas: [
              `[Batch Scanner 50] Ingestão automática em ${new Date().toLocaleDateString('pt-BR')}: "${(lastText || '').slice(0, 100)}"`
            ],
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            ultimoContatoEm: serverTimestamp()
          });
          report.novosLeadsCapturados++;
        }
      } catch (err: any) {
        report.erros.push({ remoteJid, erro: err?.message || 'Falha ao processar chat' });
      }
    }));

    // Pequena pausa defensiva (padrão Twenty)
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  return report;
}

export async function limparLeadsFalsos(): Promise<number> {
  const q = query(
    collection(db, 'leads'),
    where('origem', '==', 'whatsapp'),
    where('criadoPor', '==', 'agente_ia')
  );
  const snap = await getDocs(q);
  const deletePromises = snap.docs.map(d => deleteDoc(doc(db, 'leads', d.id)));
  await Promise.all(deletePromises);
  return snap.docs.length;
}
