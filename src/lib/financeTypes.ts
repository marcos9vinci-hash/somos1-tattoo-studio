export interface Commission {
  id: string;
  bookingId: string;
  clientName: string;
  serviceDescription: string;
  serviceValue: number;
  
  // Dados do Indicador / Afiliado
  referrerId?: string;
  referrerName?: string;
  referrerPhone?: string;
  referralCode?: string;
  commissionRate: number; // Porcentagem de comissão (ex: 10 = 10%)
  commissionAmount: number; // Valor em R$ da comissão
  
  // Dados do Tatuador / Artista
  artistId?: string;
  artistName?: string;
  artistCommissionRate?: number; // Porcentagem do tatuador (ex: 60 = 60%)
  artistCommissionAmount?: number;
  
  // Lucro retido pelo Estúdio
  studioShareAmount: number;
  
  // Status do pagamento da comissão
  status: 'pending' | 'available' | 'paid' | 'cancelled';
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FinancialEntry {
  id: string;
  type: 'income' | 'expense';
  category: 'procedimento' | 'sinal' | 'comissao_indicador' | 'comissao_artista' | 'material' | 'custo_fixo' | 'outro';
  description: string;
  amount: number;
  paymentMethod: 'pix' | 'credit_card' | 'debit_card' | 'cash';
  status: 'completed' | 'pending';
  bookingId?: string;
  date: string;
  createdAt: string;
}

export interface FinanceSummary {
  grossRevenue: number;          // Faturamento bruto total
  monthRevenue: number;          // Faturamento deste mês
  depositTotal: number;          // Total de sinais recebidos
  commissionsPending: number;    // Comissões a pagar aos indicadores
  commissionsPaid: number;       // Comissões já pagas aos indicadores
  artistCommissionsTotal: number;// Repasse aos artistas/tatuadores
  studioNetProfit: number;       // Lucro líquido retido pelo estúdio
  completedBookingsCount: number;// Quantidade de atendimentos concluídos
  ticketAverage: number;         // Ticket médio por atendimento
  recentCommissions: Commission[];
  recentEntries: FinancialEntry[];
  monthlyChartData: { month: string; receita: number; comissoes: number; lucro: number }[];
}
