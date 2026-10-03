import React, { useState, useEffect } from 'react';
import { 
  DollarSign, TrendingUp, Users, ArrowUpRight, ArrowDownRight, 
  CheckCircle2, Clock, AlertCircle, RefreshCw, Wallet, ShieldAlert,
  Calendar, CreditCard, ChevronRight, FileSpreadsheet
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar 
} from 'recharts';
import { getFinancialSummary, markCommissionAsPaid, ENABLE_WHATSAPP_REFERRAL_NOTIFICATION } from '../../lib/financeService';
import { FinanceSummary, Commission } from '../../lib/financeTypes';

export default function AdminFinanceiroModule() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'available' | 'paid'>('all');
  const [payingId, setPayingId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getFinancialSummary();
      setSummary(data);
    } catch (err) {
      console.error('Erro ao carregar dados financeiros:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handlePay = async (commission: Commission) => {
    const confirmPayment = window.confirm(
      `Confirmar baixa de pagamento da comissão de R$ ${commission.commissionAmount.toFixed(2)} para ${commission.referrerName || 'o indicador'}?`
    );
    if (!confirmPayment) return;

    setPayingId(commission.id);
    const success = await markCommissionAsPaid(commission.id, 'pix');
    setPayingId(null);

    if (success) {
      setSuccessMessage(`Comissão de R$ ${commission.commissionAmount.toFixed(2)} baixada com sucesso!`);
      setTimeout(() => setSuccessMessage(null), 4000);
      await loadData();
    } else {
      alert('Falha ao processar baixa. Tente novamente.');
    }
  };

  const filteredCommissions = (summary?.recentCommissions || []).filter(c => {
    if (filterStatus === 'all') return true;
    return c.status === filterStatus;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner: Status & Controles */}
      <div className="bg-gradient-to-r from-zinc-900 via-zinc-900 to-black border border-zinc-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400">
                <Wallet className="w-5 h-5" />
              </span>
              <h2 className="text-xl md:text-2xl font-black font-headline text-white tracking-wide uppercase">
                Gestão Financeira & Comissões
              </h2>
            </div>
            <p className="text-xs text-zinc-400">
              Controle de faturamento, split de receitas, repasses e comissões do Indica Aí em tempo real.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadData}
              disabled={loading}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Atualizar Dados
            </button>
          </div>
        </div>

        {/* Notificação / Flag Informativa do WhatsApp */}
        <div className="mt-4 pt-4 border-t border-zinc-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-zinc-400">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
            <span>Disparador de WhatsApp para Indicações:</span>
            <span className="font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
              {ENABLE_WHATSAPP_REFERRAL_NOTIFICATION ? 'ATIVO' : 'CONGELADO (Sob Ajuste)'}
            </span>
          </div>
          <span className="text-[11px] text-zinc-500">
            * As comissões são calculadas no banco, mas as notificações automáticas permanecem pausadas conforme solicitado.
          </span>
        </div>
      </div>

      {successMessage && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs font-semibold flex items-center gap-3 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Faturamento Total */}
        <div className="bg-zinc-900/90 border border-zinc-800 p-5 rounded-2xl shadow-lg relative overflow-hidden group hover:border-zinc-700 transition-all">
          <div className="flex justify-between items-start mb-3">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Faturamento Bruto</span>
            <span className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
              <DollarSign className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-white font-headline">
            R$ {loading ? '---' : (summary?.grossRevenue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-emerald-400">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>R$ {(summary?.monthRevenue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} este mês</span>
          </div>
        </div>

        {/* Card 2: Lucro Líquido Estúdio */}
        <div className="bg-zinc-900/90 border border-zinc-800 p-5 rounded-2xl shadow-lg relative overflow-hidden group hover:border-zinc-700 transition-all">
          <div className="flex justify-between items-start mb-3">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Lucro Líquido Estúdio</span>
            <span className="p-2 bg-blue-500/10 text-blue-400 rounded-xl">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-white font-headline">
            R$ {loading ? '---' : (summary?.studioNetProfit || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-zinc-400">
            <span>Margem retida do estúdio (~30%)</span>
          </div>
        </div>

        {/* Card 3: Comissões Indica Aí */}
        <div className="bg-zinc-900/90 border border-zinc-800 p-5 rounded-2xl shadow-lg relative overflow-hidden group hover:border-zinc-700 transition-all">
          <div className="flex justify-between items-start mb-3">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Comissões Indica Aí</span>
            <span className="p-2 bg-amber-500/10 text-amber-400 rounded-xl">
              <Users className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-amber-400 font-headline">
            R$ {loading ? '---' : (summary?.commissionsPending || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-400">
            <span>Pendente de repasse</span>
            <span className="text-zinc-500">Pagas: R$ {(summary?.commissionsPaid || 0).toFixed(2)}</span>
          </div>
        </div>

        {/* Card 4: Ticket Médio & Atendimentos */}
        <div className="bg-zinc-900/90 border border-zinc-800 p-5 rounded-2xl shadow-lg relative overflow-hidden group hover:border-zinc-700 transition-all">
          <div className="flex justify-between items-start mb-3">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Ticket Médio</span>
            <span className="p-2 bg-purple-500/10 text-purple-400 rounded-xl">
              <CreditCard className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-white font-headline">
            R$ {loading ? '---' : (summary?.ticketAverage || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-zinc-400">
            <span>{summary?.completedBookingsCount || 0} atendimentos realizados</span>
          </div>
        </div>
      </div>

      {/* Gráfico de Evolução e Repartição de Lucros */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-base font-bold text-white font-headline uppercase tracking-wider">
              Evolução Financeira dos Últimos Meses
            </h3>
            <p className="text-xs text-zinc-400">Comparativo entre faturamento bruto, comissões de parceiros e lucro líquido</p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-zinc-300">Receita Total</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber-400" />
              <span className="text-zinc-300">Comissões</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="text-zinc-300">Lucro Estúdio</span>
            </div>
          </div>
        </div>

        <div className="h-64 w-full">
          {loading || !summary?.monthlyChartData ? (
            <div className="h-full flex items-center justify-center text-zinc-500 text-xs">
              Carregando dados do gráfico...
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={summary.monthlyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorLucro" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="month" stroke="#71717a" fontSize={11} />
                <YAxis stroke="#71717a" fontSize={11} tickFormatter={(val) => `R$ ${val}`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '12px', fontSize: '12px' }}
                  formatter={(value: any) => [`R$ ${Number(value).toFixed(2)}`, '']}
                />
                <Area type="monotone" dataKey="receita" name="Receita" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorReceita)" />
                <Area type="monotone" dataKey="lucro" name="Lucro Estúdio" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorLucro)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Tabela de Comissões e Repasses a Indicadores */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-base font-bold text-white font-headline uppercase tracking-wider flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-amber-400" />
              Livro de Comissões e Repasses (Indica Aí)
            </h3>
            <p className="text-xs text-zinc-400">
              Registros gerados a partir dos agendamentos com cálculo automático de comissão
            </p>
          </div>

          {/* Filtros de Status */}
          <div className="flex items-center gap-2 bg-zinc-950 p-1 rounded-xl border border-zinc-800 text-xs">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${filterStatus === 'all' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'}`}
            >
              Todos
            </button>
            <button
              onClick={() => setFilterStatus('pending')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${filterStatus === 'pending' ? 'bg-amber-500/20 text-amber-300' : 'text-zinc-400 hover:text-white'}`}
            >
              Pendentes
            </button>
            <button
              onClick={() => setFilterStatus('paid')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${filterStatus === 'paid' ? 'bg-emerald-500/20 text-emerald-300' : 'text-zinc-400 hover:text-white'}`}
            >
              Pagos
            </button>
          </div>
        </div>

        {/* Tabela */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-[10px] text-zinc-400 uppercase tracking-wider border-b border-zinc-800">
              <tr>
                <th className="pb-3 font-semibold">Cliente & Serviço</th>
                <th className="pb-3 font-semibold">Indicador / Afiliado</th>
                <th className="pb-3 font-semibold text-right">Valor Serviço</th>
                <th className="pb-3 font-semibold text-right">Comissão (R$)</th>
                <th className="pb-3 font-semibold text-right">Split Artista</th>
                <th className="pb-3 font-semibold text-center">Status</th>
                <th className="pb-3 font-semibold text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {filteredCommissions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-zinc-500">
                    Nenhum registro de comissão encontrado para o filtro selecionado.
                  </td>
                </tr>
              ) : (
                filteredCommissions.map((comm) => (
                  <tr key={comm.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="py-3.5 pr-4">
                      <div className="font-semibold text-zinc-200">{comm.clientName}</div>
                      <div className="text-[11px] text-zinc-500">{comm.serviceDescription}</div>
                    </td>
                    <td className="py-3.5 pr-4">
                      <div className="font-medium text-amber-300">{comm.referrerName || 'Indica Aí'}</div>
                      <div className="text-[10px] text-zinc-500">
                        {comm.referralCode ? `Código: ${comm.referralCode}` : 'Link Direto'}
                      </div>
                    </td>
                    <td className="py-3.5 text-right font-medium text-zinc-300">
                      R$ {comm.serviceValue.toFixed(2)}
                    </td>
                    <td className="py-3.5 text-right font-bold text-amber-400">
                      R$ {comm.commissionAmount.toFixed(2)}
                      <div className="text-[10px] text-zinc-500 font-normal">({comm.commissionRate}%)</div>
                    </td>
                    <td className="py-3.5 text-right text-zinc-400">
                      R$ {(comm.artistCommissionAmount || 0).toFixed(2)}
                      <div className="text-[10px] text-zinc-500">({comm.artistCommissionRate || 60}%)</div>
                    </td>
                    <td className="py-3.5 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        comm.status === 'paid' 
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                          : comm.status === 'available'
                          ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}>
                        {comm.status === 'paid' ? 'Pago' : comm.status === 'available' ? 'Liberado' : 'Pendente'}
                      </span>
                    </td>
                    <td className="py-3.5 text-right">
                      {comm.status !== 'paid' ? (
                        <button
                          onClick={() => handlePay(comm)}
                          disabled={payingId === comm.id}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg font-bold text-[11px] inline-flex items-center gap-1.5 transition-all shadow-sm"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Dar Baixa (Pix)
                        </button>
                      ) : (
                        <span className="text-[11px] text-emerald-400 font-medium inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Liquidado
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
