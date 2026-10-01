export type LeadStage = 'novo' | 'qualificacao' | 'pronto' | 'agendado' | 'concluido' | 'perdido';

export type LeadSource = 'whatsapp' | 'instagram' | 'indicacao' | 'site' | 'manual' | 'n8n_agente';

export type ClienteLifecycleStage = 'novo' | 'negociacao' | 'ativo' | 'recorrente' | 'inativo';

export interface SPINAnalysis {
  situacao?: string;
  problema?: string;
  implicacao?: string;
  necessidade?: string;
  perfilComportamental?: 'analitico' | 'expressivo' | 'afavel' | 'diretivo';
  urgencia?: 'baixa' | 'media' | 'alta';
  ticketEstimado?: number;
}

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
  notasInternas?: string[];
  responsavelAtendimento?: string; // 'IA_Assessor' ou nome do atendente humano
  criadoPor?: 'agente_ia' | 'usuario_admin' | 'usuario_publico';
  createdAt: any;
  updatedAt: any;
  ultimoContatoEm?: any;
}

export interface ClienteCRM {
  id: string;
  nome: string;
  telefone: string;
  email?: string;
  instagram?: string;
  origem?: string;
  estagioCiclo: ClienteLifecycleStage;
  totalGasto: number;
  totalSessoes: number;
  ultimaSessaoEm?: any;
  diasSemContato?: number;
  estilosFavoritos?: string[];
  fotosTatuagensFeitas?: string[];
  notasInternas?: string[];
  alertaFollowUpAtivo?: boolean;
  ultimoDisparoFollowUpEm?: any;
  createdAt: any;
  updatedAt: any;
}

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

export interface CRMDashboardMetrics {
  totalLeads: number;
  leadsNovos: number;
  leadsQualificados: number;
  leadsAgendados: number;
  taxaConversao: number;
  totalClientes: number;
  clientesInativos: number;
  totalFollowUpsPendentes: number;
}
