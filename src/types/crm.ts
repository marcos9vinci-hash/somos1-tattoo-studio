// ==========================================
// FUNIL 1 — COMERCIAL (pré-tattoo)
// ==========================================

/** Etapas do Funil Comercial de Leads */
export type LeadStage =
  | 'novo'          // Chegou mas ainda não foi qualificado
  | 'qualificacao'  // IA coletando referências, estilo, tamanho
  | 'negociacao'    // Qualificado — negociando orçamento/valor
  | 'agendado'      // Sessão marcada na agenda
  | 'concluido'     // Tattoo realizada no estúdio
  | 'pos_venda'     // Pós-venda e cicatrização pós-sessão
  | 'followup'      // Sumiu sem fechar ou faltou → resgate
  | 'perdido';      // Definitivamente perdido (oculto por padrão)

export type LeadSource = 'whatsapp' | 'instagram' | 'indicacao' | 'site' | 'manual' | 'n8n_agente';

/** Modo de Operação do Agente de IA da Coluna */
export type ModoAtuacaoAgente = 'copiloto' | 'apenas_sugerir' | 'autonomo' | 'silencioso';

/** Configuração dos Agentes de IA por Coluna (Base NAIA) */
export interface ColunaAIAgentConfig {
  id: string;
  stageId: LeadStage;
  nomeAgente: string;
  papel: string;
  origemNaia: string;
  tomDeVoz: 'casual_estudio' | 'consultivo_spin' | 'acolhedor_posvenda' | 'persuasivo_copy';
  promptBase: string;
  skillsAtivas: string[];
  ativo: boolean;
  tempoEsperaMinutos?: number;
  modoAtuacao?: ModoAtuacaoAgente;
  notificarWhatsAppTatuador?: boolean;
  webhookAtivo?: boolean;
}

// ==========================================
// FUNIL 2 — CARTEIRA DE CLIENTES (pós-tattoo)
// ==========================================

/**
 * Temperatura do cliente na Carteira — baseada em diasSemContato.
 * Quente   0–7d   → Cicatrização (Evolution dispara automático)
 * Morno    8–30d  → Pedir review, lançar no IndicaAi
 * Esfriando 31–90d → Reengajamento, Galeria IA, promoções
 * Alerta   91–179d → Créditos IndicaAi vencem em 180d — urgente
 * Expirado >180d  → Créditos expirados — campanha especial
 */
export type ClienteCarteiraTempStage =
  | 'quente'
  | 'morno'
  | 'esfriando'
  | 'alerta'
  | 'expirado'
  | 'emReativacao'  // Lead reaberto no Funil Comercial — temporário até fechar de novo
  | 'desmarcou';    // Cliente faltou (No-Show) ou desmarcou a sessão

export type BucketTemperatura = ClienteCarteiraTempStage;

/** @deprecated Usar ClienteCarteiraTempStage. Mantido para compatibilidade temporária. */
export type ClienteLifecycleStage =
  | 'novo' | 'novos'
  | 'negociacao'
  | 'ativo' | 'ativos'
  | 'recorrente' | 'recorrentes'
  | 'desmarcaram'
  | 'inativo' | 'inativos'
  | ClienteCarteiraTempStage;

// ==========================================
// TIPOS COMPARTILHADOS
// ==========================================

export interface CRMMessage {
  id: string;
  clienteId: string;
  remetente: 'cliente' | 'ia' | 'tatuador';
  mensagem: string;
  timestamp: any;
  status: 'enviado' | 'entregue' | 'lido';
}

export interface SPINAnalysis {
  situacao?: string;
  problema?: string;
  implicacao?: string;
  necessidade?: string;
  perfilComportamental?: 'analitico' | 'expressivo' | 'afavel' | 'diretivo';
  urgencia?: 'baixa' | 'media' | 'alta';
  ticketEstimado?: number;
}

// ==========================================
// ENTIDADE: LEAD (Funil Comercial)
// ==========================================

export interface Lead {
  id: string;
  nome: string;
  telefone: string;
  email?: string;
  instagram?: string;
  origem: LeadSource;
  estagio: LeadStage;
  temperatura?: 'frio' | 'morno' | 'quente';
  ideiaProjeto?: string;
  estiloTatuagem?: string;
  tamanhoAproximado?: string;
  localCorpo?: string;
  orcamentoMaximo?: number;
  artistaDesejadoId?: string;
  artistaDesejadoNome?: string;
  fotosReferencia?: string[];
  spin?: SPINAnalysis;
  valorSinal?: number;
  sinalPago?: boolean;
  chavePixSinal?: string;
  dataAgendada?: string;
  horaAgendada?: string;
  notasInternas?: string[];
  responsavelAtendimento?: string; // 'IA_Assessor' ou nome do atendente humano
  criadoPor?: 'agente_ia' | 'usuario_admin' | 'usuario_publico';
  createdAt: any;
  updatedAt: any;
  ultimoContatoEm?: any;
}

// ==========================================
// ENTIDADE: CLIENTE CRM (Carteira pós-tattoo)
// ==========================================

export interface ClienteCRM {
  id: string;
  nome: string;
  telefone: string;
  email?: string;
  instagram?: string;
  origem?: string;

  /** Temperatura na Carteira de Clientes — calculada a partir de diasSemContato */
  bucketTemperatura: ClienteCarteiraTempStage;

  /** @deprecated Usar bucketTemperatura */
  estagioCiclo?: ClienteLifecycleStage;

  totalGasto: number;
  totalSessoes: number;
  ultimaSessaoEm?: any;
  diasSemContato?: number;
  estilosFavoritos?: string[];
  fotosTatuagensFeitas?: string[];
  notasInternas?: string[];
  observacoesInternas?: string;
  agendamentos?: any[];
  mensagens?: CRMMessage[];
  alertaFollowUpAtivo?: boolean;
  ultimoDisparoFollowUpEm?: any;

  /** True se o cliente tem sessão agendada mas ainda não concluída */
  temSessaoAgendada?: boolean;

  /** Data em que o cliente desmarcou a última sessão — gera badge no card */
  desmarcouEm?: any;

  /** Se em reativação, ID do lead criado no Funil Comercial */
  emReativacaoLeadId?: string;

  createdAt: any;
  updatedAt: any;
}

// ==========================================
// UTILITÁRIO: Calcular temperatura por diasSemContato
// ==========================================

export function calcularBucketTemperatura(
  diasSemContato: number | undefined,
  totalSessoes: number,
  ultimoStatus?: string,
  temNoShow?: boolean
): ClienteCarteiraTempStage {
  const normStatus = (ultimoStatus || '').toLowerCase().replace('-', '_').trim();
  // Se o cliente faltou (No-Show) ou desmarcou/cancelou, ele vai direto para a coluna de Faltou / No-Show
  if (temNoShow || normStatus === 'no_show' || normStatus === 'rejected') {
    return 'desmarcou';
  }

  // Se não tem contato registrado, assume "morno" por padrão
  if (diasSemContato === undefined) {
    return 'morno';
  }

  const dias = diasSemContato;
  // "quente" é EXCLUSIVO para cicatrização pós-tattoo (0-7 dias COM sessão concluída)
  if (dias <= 7)   return totalSessoes > 0 ? 'quente' : 'morno';
  if (dias <= 30)  return 'morno';       // 8–30 dias (cicatrização final/cuidados)
  if (dias <= 90)  return 'esfriando';   // 31–90 dias (tempo ideal para nova tattoo)
  if (dias <= 179) return 'alerta';      // 91–179 dias (risco de perder o cliente)
  return 'expirado';                     // >180 dias (cliente inativo há mais de 6 meses)
}

// ==========================================
// ESTRATÉGIAS DE CAMPANHA & REATIVAÇÃO
// ==========================================

export interface EstrategiaCampanha {
  id: string;
  titulo: string;
  descricao: string;
  emoji: string;
  criterioTipo: 'dias' | 'temperatura' | 'desmarcou' | 'saldo_indicacao';
  diasMin?: number;
  diasMax?: number;
  temperaturaAlvo?: ClienteCarteiraTempStage[];
  mensagemTemplate: string;
  especialistaAssinatura?: string;
  ativa: boolean;
  limiteDiario?: number;
  // Sequência e cadência de disparos (Anti-Bloqueio Meta)
  modoCadencia?: 'fixo' | 'sequencial' | 'aleatorio';
  intervaloMinutosFixo?: number;
  sequenciaTimersMinutos?: number[]; // Ex: [5, 10, 15, 10]
  createdAt?: any;
  updatedAt?: any;
}

// ==========================================
// TAREFAS CRM
// ==========================================

export interface CRMTask {
  id: string;
  tipo: 'follow_up' | 'confirmacao' | 'reativacao' | 'pos_venda' | 'manual';
  entidadeTipo: 'lead' | 'cliente';
  entidadeId: string;
  entidadeNome: string;
  entidadeTelefone: string;
  mensagemSugerida?: string;
  status: 'pendente' | 'executado' | 'cancelado';
  executadoPor?: 'agente_ia' | 'admin';
  dataAgendada: any;
  executadoEm?: any;
  createdAt: any;
}

// ==========================================
// MÉTRICAS DE DASHBOARD
// ==========================================

export interface CRMDashboardMetrics {
  totalLeads: number;
  leadsNovos: number;
  leadsQualificados: number;
  leadsNegociacao?: number;
  leadsAgendados: number;
  leadsConcluidos?: number;
  taxaConversao: number;
  taxaQualificacao?: number;
  taxaFechamento?: number;
  pipelineEstimado?: number;
  totalClientes: number;
  clientesInativos: number;
  totalFollowUpsPendentes: number;
  /** Distribuição de temperatura da Carteira */
  temperaturaCounts?: {
    quente: number;
    morno: number;
    esfriando: number;
    alerta: number;
    expirado: number;
    emReativacao: number;
    desmarcou: number;
  };
}
