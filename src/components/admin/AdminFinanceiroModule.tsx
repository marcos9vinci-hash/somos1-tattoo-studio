import React, { useState, useEffect } from 'react';
import { 
  DollarSign, TrendingUp, TrendingDown, Users, ArrowUpRight, ArrowDownRight, 
  CheckCircle2, Clock, AlertCircle, RefreshCw, Wallet, ShieldAlert,
  Calendar, CreditCard, ChevronRight, FileSpreadsheet, Plus, Trash2, 
  Filter, X, Sparkles, Building, Receipt, ArrowUpDown
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { 
  getFinancialSummary, 
  addContaPagar, 
  markContaPagarAsPaid, 
  deleteContaPagar,
  addContaReceber,
  markContaReceberAsPaid,
  deleteContaReceber,
  markCommissionAsPaid, 
  seedInitialStudioData,
  ENABLE_WHATSAPP_REFERRAL_NOTIFICATION,
  DEFAULT_REFERRER_RATE,
  DEFAULT_ARTIST_RATE,
  DEFAULT_STUDIO_RATE
} from '../../lib/financeService';
import { FinanceSummary, Commission, ContaPagar, ContaReceber } from '../../lib/financeTypes';
import { PixReceiptAiModal } from '../crm/PixReceiptAiModal';

type ActiveTab = 'geral' | 'pagar' | 'receber' | 'comissoes';

interface AdminFinanceiroModuleProps {
  bookings?: any[];
  users?: any[];
}

export default function AdminFinanceiroModule({ bookings = [], users = [] }: AdminFinanceiroModuleProps) {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('geral');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Modais de Abertura
  const [isModalPagarOpen, setIsModalPagarOpen] = useState(false);
  const [isModalReceberOpen, setIsModalReceberOpen] = useState(false);
  const [scannerTarget, setScannerTarget] = useState<'pagar' | 'receber' | null>(null);

  // Formulário Nova Conta a Pagar
  const [novoPagar, setNovoPagar] = useState({
    descricao: '',
    fornecedor: '',
    valor: '',
    vencimento: new Date().toISOString().split('T')[0],
    categoria: 'material' as const,
    formaPgto: 'pix' as const,
    status: 'pendente' as const,
    obs: ''
  });

  // Formulário Nova Conta a Receber
  const [novoReceber, setNovoReceber] = useState({
    descricao: '',
    cliente: '',
    clienteTelefone: '',
    valor: '',
    valorSinal: '',
    vencimento: new Date().toISOString().split('T')[0],
    formaPgto: 'pix' as const,
    status: 'pago' as const,
    artistaNome: 'Markinhos Tatuador',
    indicadorNome: '',
    hasIndicador: false,
    obs: ''
  });

  // Filtros
  const [filterPagar, setFilterPagar] = useState<'todos' | 'pendente' | 'pago'>('todos');
  const [filterReceber, setFilterReceber] = useState<'todos' | 'pendente' | 'pago'>('todos');
  const [filterComissao, setFilterComissao] = useState<'todos' | 'pending' | 'paid'>('todos');

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getFinancialSummary(bookings);
      setSummary(data);
    } catch (err) {
      console.error('Erro ao carregar dados financeiros:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [bookings]);

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const handleApplyScannerResult = (analysis: any) => {
    if (scannerTarget === 'pagar') {
      setNovoPagar(prev => ({
        ...prev,
        descricao: prev.descricao || analysis.descricaoSugerida || 'Despesa PIX',
        fornecedor: analysis.favorecido || prev.fornecedor,
        valor: String(analysis.valor || prev.valor),
        vencimento: analysis.data || prev.vencimento,
        formaPgto: 'pix',
        obs: analysis.idTransacao ? `Autenticação PIX: ${analysis.idTransacao}` : prev.obs
      }));
      showSuccess(`Dados do comprovante de R$ ${analysis.valor.toFixed(2)} preenchidos com sucesso!`);
    } else if (scannerTarget === 'receber') {
      setNovoReceber(prev => ({
        ...prev,
        cliente: analysis.pagador || prev.cliente,
        valor: prev.valor || String(analysis.valor),
        valorSinal: String(analysis.valor),
        status: prev.valor && Number(prev.valor) > analysis.valor ? 'sinal_pago' : 'pago',
        vencimento: analysis.data || prev.vencimento,
        formaPgto: 'pix',
        obs: analysis.idTransacao ? `Autenticação PIX: ${analysis.idTransacao} (${analysis.banco || ''})` : prev.obs
      }));
      showSuccess(`Comprovante PIX de R$ ${analysis.valor.toFixed(2)} lido e preenchido!`);
    }
    setScannerTarget(null);
  };

  // --- Handlers Contas a Pagar ---
  const handleSavePagar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoPagar.descricao || !novoPagar.valor || Number(novoPagar.valor) <= 0) {
      alert('Preencha a descrição e um valor válido.');
      return;
    }

    setActionLoading(true);
    const result = await addContaPagar({
      descricao: novoPagar.descricao,
      fornecedor: novoPagar.fornecedor || 'Fornecedor Diversos',
      valor: parseFloat(novoPagar.valor),
      vencimento: novoPagar.vencimento,
      categoria: novoPagar.categoria,
      formaPgto: novoPagar.formaPgto,
      status: novoPagar.status,
      dataPgto: novoPagar.status === 'pago' ? novoPagar.vencimento : undefined,
      obs: novoPagar.obs
    });
    setActionLoading(false);

    if (result) {
      setIsModalPagarOpen(false);
      setNovoPagar({
        descricao: '',
        fornecedor: '',
        valor: '',
        vencimento: new Date().toISOString().split('T')[0],
        categoria: 'material',
        formaPgto: 'pix',
        status: 'pendente',
        obs: ''
      });
      showSuccess(`Despesa "${result.descricao}" cadastrada com sucesso!`);
      await loadData();
    } else {
      alert('Erro ao cadastrar despesa.');
    }
  };

  const handlePayPagar = async (id: string, descricao: string) => {
    if (!window.confirm(`Confirmar baixa de pagamento para "${descricao}"?`)) return;
    setActionLoading(true);
    const ok = await markContaPagarAsPaid(id);
    setActionLoading(false);
    if (ok) {
      showSuccess(`Conta "${descricao}" marcada como PAGA!`);
      await loadData();
    }
  };

  const handleDeletePagar = async (id: string, descricao: string) => {
    if (!window.confirm(`Excluir a conta a pagar "${descricao}"?`)) return;
    setActionLoading(true);
    const ok = await deleteContaPagar(id);
    setActionLoading(false);
    if (ok) {
      showSuccess(`Conta excluída com sucesso!`);
      await loadData();
    }
  };

  // --- Handlers Contas a Receber ---
  const handleSaveReceber = async (e: React.FormEvent) => {
    e.preventDefault();
    const valorNum = parseFloat(novoReceber.valor);
    if (!novoReceber.cliente || !novoReceber.descricao || isNaN(valorNum) || valorNum <= 0) {
      alert('Preencha o cliente, descrição e um valor total válido.');
      return;
    }

    const sinalNum = parseFloat(novoReceber.valorSinal) || 0;
    const splitIndicador = novoReceber.hasIndicador ? Number(((valorNum * DEFAULT_REFERRER_RATE) / 100).toFixed(2)) : 0;
    const splitArtista = Number(((valorNum * DEFAULT_ARTIST_RATE) / 100).toFixed(2));
    const splitEstudio = Number((valorNum - splitIndicador - splitArtista).toFixed(2));

    setActionLoading(true);
    const result = await addContaReceber({
      cliente: novoReceber.cliente,
      clienteTelefone: novoReceber.clienteTelefone,
      descricao: novoReceber.descricao,
      valor: valorNum,
      valorSinal: sinalNum,
      vencimento: novoReceber.vencimento,
      dataPgto: novoReceber.status === 'pago' ? novoReceber.vencimento : undefined,
      formaPgto: novoReceber.formaPgto,
      status: novoReceber.status,
      artistaNome: novoReceber.artistaNome,
      artistaComissao: splitArtista,
      indicadorNome: novoReceber.hasIndicador ? (novoReceber.indicadorNome || 'Indica Aí') : undefined,
      indicadorComissao: splitIndicador,
      lucroEstudio: splitEstudio,
      obs: novoReceber.obs
    });
    setActionLoading(false);

    if (result) {
      setIsModalReceberOpen(false);
      setNovoReceber({
        descricao: '',
        cliente: '',
        clienteTelefone: '',
        valor: '',
        valorSinal: '',
        vencimento: new Date().toISOString().split('T')[0],
        formaPgto: 'pix',
        status: 'pago',
        artistaNome: 'Markinhos Tatuador',
        indicadorNome: '',
        hasIndicador: false,
        obs: ''
      });
      showSuccess(`Receita "${result.descricao}" lançada com sucesso!`);
      await loadData();
    } else {
      alert('Erro ao registrar recebimento.');
    }
  };

  const handlePayReceber = async (id: string, cliente: string) => {
    if (!window.confirm(`Confirmar quitação total do atendimento de "${cliente}"?`)) return;
    setActionLoading(true);
    const ok = await markContaReceberAsPaid(id);
    setActionLoading(false);
    if (ok) {
      showSuccess(`Recebimento quitado e lançado no Caixa!`);
      await loadData();
    }
  };

  const handleDeleteReceber = async (id: string, cliente: string) => {
    if (!window.confirm(`Excluir conta a receber de "${cliente}"?`)) return;
    setActionLoading(true);
    const ok = await deleteContaReceber(id);
    setActionLoading(false);
    if (ok) {
      showSuccess(`Recebimento excluído.`);
      await loadData();
    }
  };

  // --- Handlers Comissões Indica Aí ---
  const handlePayCommission = async (commission: Commission) => {
    const confirmPayment = window.confirm(
      `Confirmar baixa de repasse da comissão de R$ ${commission.commissionAmount.toFixed(2)} para ${commission.referrerName || 'o indicador'}?`
    );
    if (!confirmPayment) return;

    setActionLoading(true);
    const success = await markCommissionAsPaid(commission.id, 'pix');
    setActionLoading(false);

    if (success) {
      showSuccess(`Comissão de R$ ${commission.commissionAmount.toFixed(2)} baixada com sucesso!`);
      await loadData();
    } else {
      alert('Falha ao processar baixa.');
    }
  };

  // --- Carregar Dados Iniciais Demo ---
  const handleSeedData = async () => {
    if (!window.confirm("Deseja carregar lançamentos de exemplo do estúdio para testar o sistema financeiro completo agora?")) return;
    setActionLoading(true);
    await seedInitialStudioData();
    setActionLoading(false);
    showSuccess("Lançamentos de estúdio carregados com sucesso! O ERP agora está 100% preenchido.");
    await loadData();
  };

  // Filtros aplicados
  const filteredPagar = (summary?.contasPagar || []).filter(item => {
    if (filterPagar === 'todos') return true;
    return item.status === filterPagar;
  });

  const filteredReceber = (summary?.contasReceber || []).filter(item => {
    if (filterReceber === 'todos') return true;
    return item.status === filterReceber;
  });

  const filteredComissoes = (summary?.recentCommissions || []).filter(item => {
    if (filterComissao === 'todos') return true;
    return item.status === filterComissao;
  });

  const hasZeroData = (summary?.contasPagar?.length === 0 && summary?.contasReceber?.length === 0 && summary?.grossRevenue === 0);

  return (
    <div className="space-y-6">
      {/* Top Banner do ERP */}
      <div className="bg-gradient-to-r from-zinc-900 via-zinc-900 to-black border border-zinc-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400">
                <Wallet className="w-5 h-5" />
              </span>
              <h2 className="text-xl md:text-2xl font-black font-headline text-white tracking-wide uppercase">
                Sistema Financeiro & ERP Somos 1
              </h2>
            </div>
            <p className="text-xs text-zinc-400">
              Contas a pagar, contas a receber, fluxo de caixa e split de comissões automatizado.
            </p>
          </div>

          {/* Botões Rápidos de Ação */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsModalReceberOpen(true)}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold font-headline flex items-center gap-1.5 transition-all shadow-md active:scale-95"
            >
              <Plus className="w-4 h-4" />
              + Nova Receita
            </button>

            <button
              onClick={() => setIsModalPagarOpen(true)}
              className="px-3.5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold font-headline flex items-center gap-1.5 transition-all shadow-md active:scale-95"
            >
              <Plus className="w-4 h-4" />
              + Nova Despesa
            </button>

            {hasZeroData && (
              <button
                onClick={handleSeedData}
                disabled={actionLoading}
                className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-black rounded-xl text-xs font-black font-headline flex items-center gap-1.5 transition-all shadow-md animate-pulse active:scale-95"
                title="Popula dados de exemplo do estúdio para testar imediatamente"
              >
                <Sparkles className="w-4 h-4" />
                Carregar Exemplo Estúdio
              </button>
            )}

            <button
              onClick={loadData}
              disabled={loading || actionLoading}
              className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-xl text-xs font-semibold flex items-center justify-center transition-all shadow-sm"
              title="Recarregar dados"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Notificação / Flag Informativa do WhatsApp */}
        <div className="mt-4 pt-4 border-t border-zinc-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-zinc-400">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
            <span>Notificação WhatsApp do Indica Aí:</span>
            <span className="font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 text-[10px]">
              {ENABLE_WHATSAPP_REFERRAL_NOTIFICATION ? 'ATIVO' : 'CONGELADO (Ajustes de Regra)'}
            </span>
          </div>
          <span className="text-[11px] text-zinc-500">
            * O cálculo de comissões e repasses é 100% automático no banco. Disparos externos permanecem em pausa.
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
        {/* Card 1: Saldo Líquido em Caixa */}
        <div className="bg-zinc-900/90 border border-zinc-800 p-5 rounded-2xl shadow-lg relative overflow-hidden group hover:border-zinc-700 transition-all">
          <div className="flex justify-between items-start mb-3">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Saldo em Caixa</span>
            <span className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
              <Wallet className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-emerald-400 font-headline">
            R$ {loading ? '---' : (summary?.netCashBalance || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-zinc-400">
            <span>Entradas quitadas - Saídas pagas</span>
          </div>
        </div>

        {/* Card 2: Faturamento Total / Mês */}
        <div className="bg-zinc-900/90 border border-zinc-800 p-5 rounded-2xl shadow-lg relative overflow-hidden group hover:border-zinc-700 transition-all">
          <div className="flex justify-between items-start mb-3">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Faturamento Bruto</span>
            <span className="p-2 bg-blue-500/10 text-blue-400 rounded-xl">
              <DollarSign className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-white font-headline">
            R$ {loading ? '---' : (summary?.grossRevenue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-blue-400">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>A receber pendente: R$ {(summary?.pendingReceivables || 0).toFixed(2)}</span>
          </div>
        </div>

        {/* Card 3: Despesas Totais / Contas a Pagar */}
        <div className="bg-zinc-900/90 border border-zinc-800 p-5 rounded-2xl shadow-lg relative overflow-hidden group hover:border-zinc-700 transition-all">
          <div className="flex justify-between items-start mb-3">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Despesas / Saídas</span>
            <span className="p-2 bg-red-500/10 text-red-400 rounded-xl">
              <TrendingDown className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-red-400 font-headline">
            R$ {loading ? '---' : (summary?.totalExpenses || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-400">
            <span>A pagar pendente:</span>
            <span className="text-amber-400 font-bold">R$ {(summary?.pendingPayables || 0).toFixed(2)}</span>
          </div>
        </div>

        {/* Card 4: Comissões Indica Aí */}
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
            <span>Pendente repasse</span>
            <span className="text-emerald-400">Pagas: R$ {(summary?.commissionsPaid || 0).toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Navegação entre Abas do ERP */}
      <div className="flex items-center gap-2 border-b border-zinc-800 pb-3 overflow-x-auto scrollbar-hide text-xs">
        <button
          onClick={() => setActiveTab('geral')}
          className={`px-4 py-2.5 rounded-xl font-bold font-headline transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'geral' 
              ? 'bg-zinc-100 text-zinc-950 shadow-md' 
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
          }`}
        >
          <Building className="w-4 h-4" />
          Visão Geral & Gráficos
        </button>

        <button
          onClick={() => setActiveTab('pagar')}
          className={`px-4 py-2.5 rounded-xl font-bold font-headline transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'pagar' 
              ? 'bg-red-500 text-white shadow-md' 
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
          }`}
        >
          <TrendingDown className="w-4 h-4" />
          Contas a Pagar ({summary?.contasPagar?.length || 0})
        </button>

        <button
          onClick={() => setActiveTab('receber')}
          className={`px-4 py-2.5 rounded-xl font-bold font-headline transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'receber' 
              ? 'bg-emerald-600 text-white shadow-md' 
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          Contas a Receber ({summary?.contasReceber?.length || 0})
        </button>

        <button
          onClick={() => setActiveTab('comissoes')}
          className={`px-4 py-2.5 rounded-xl font-bold font-headline transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'comissoes' 
              ? 'bg-amber-400 text-zinc-950 font-black shadow-md' 
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
          }`}
        >
          <Users className="w-4 h-4" />
          Repasses Indica Aí ({summary?.recentCommissions?.length || 0})
        </button>
      </div>

      {/* ================= ABA 1: VISÃO GERAL & GRÁFICO ================= */}
      {activeTab === 'geral' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Gráfico de Evolução e Repartição de Lucros */}
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-base font-bold text-white font-headline uppercase tracking-wider">
                  Evolução Financeira (Últimos 6 Meses)
                </h3>
                <p className="text-xs text-zinc-400">Comparativo entre faturamento, despesas operacionais e lucro retido</p>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="text-zinc-300">Receita</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-500" />
                  <span className="text-zinc-300">Despesas</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="text-zinc-300">Lucro</span>
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
                      <linearGradient id="colorDespesas" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
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
                    <Area type="monotone" dataKey="despesas" name="Despesas" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorDespesas)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Lançamentos Recentes no Caixa */}
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6 shadow-lg">
            <h3 className="text-sm font-bold text-white font-headline uppercase tracking-wider mb-4 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-emerald-400" />
              Últimas Movimentações do Fluxo de Caixa
            </h3>
            
            <div className="divide-y divide-zinc-800/60">
              {summary?.recentEntries?.length === 0 ? (
                <p className="text-zinc-500 text-xs py-4 text-center">Nenhuma movimentação lançada no caixa ainda.</p>
              ) : (
                summary?.recentEntries?.slice(0, 6).map((entry) => (
                  <div key={entry.id} className="py-3 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <span className={`p-2 rounded-xl ${entry.type === 'income' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                        {entry.type === 'income' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                      </span>
                      <div>
                        <div className="font-semibold text-zinc-200">{entry.description}</div>
                        <div className="text-[10px] text-zinc-500">{entry.date || 'Hoje'} • {entry.paymentMethod?.toUpperCase()}</div>
                      </div>
                    </div>
                    <div className={`font-headline font-black text-sm ${entry.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
                      {entry.type === 'income' ? '+' : '-'} R$ {entry.amount.toFixed(2)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= ABA 2: CONTAS A PAGAR ================= */}
      {activeTab === 'pagar' && (
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6 shadow-lg space-y-4 animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-white font-headline uppercase tracking-wider flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-red-400" />
                Contas a Pagar & Despesas
              </h3>
              <p className="text-xs text-zinc-400">Gastos com materiais, fornecedores, contas fixas e manutenção do estúdio</p>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800 text-xs">
                <button
                  onClick={() => setFilterPagar('todos')}
                  className={`px-2.5 py-1 rounded-lg ${filterPagar === 'todos' ? 'bg-zinc-800 text-white font-bold' : 'text-zinc-400'}`}
                >
                  Todas
                </button>
                <button
                  onClick={() => setFilterPagar('pendente')}
                  className={`px-2.5 py-1 rounded-lg ${filterPagar === 'pendente' ? 'bg-amber-500/20 text-amber-300 font-bold' : 'text-zinc-400'}`}
                >
                  Pendentes
                </button>
                <button
                  onClick={() => setFilterPagar('pago')}
                  className={`px-2.5 py-1 rounded-lg ${filterPagar === 'pago' ? 'bg-emerald-500/20 text-emerald-300 font-bold' : 'text-zinc-400'}`}
                >
                  Pagas
                </button>
              </div>

              <button
                onClick={() => setIsModalPagarOpen(true)}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold font-headline flex items-center gap-1.5 transition-all shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                Nova Despesa
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[10px] text-zinc-400 uppercase tracking-wider border-b border-zinc-800">
                <tr>
                  <th className="pb-3 font-semibold">Descrição / Fornecedor</th>
                  <th className="pb-3 font-semibold">Categoria</th>
                  <th className="pb-3 font-semibold">Vencimento</th>
                  <th className="pb-3 font-semibold text-right">Valor</th>
                  <th className="pb-3 font-semibold text-center">Status</th>
                  <th className="pb-3 font-semibold text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {filteredPagar.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-zinc-500">
                      Nenhuma conta a pagar cadastrada. Clique em "+ Nova Despesa" para registrar.
                    </td>
                  </tr>
                ) : (
                  filteredPagar.map((item) => (
                    <tr key={item.id} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="py-3.5 pr-4">
                        <div className="font-semibold text-zinc-200">{item.descricao}</div>
                        <div className="text-[11px] text-zinc-500">{item.fornecedor || 'Geral'}</div>
                      </td>
                      <td className="py-3.5 pr-4 text-zinc-400 capitalize">
                        <span className="px-2 py-0.5 bg-zinc-800 border border-zinc-700/50 rounded text-[10px]">
                          {item.categoria.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3.5 pr-4 text-zinc-300">
                        {item.vencimento ? item.vencimento.split('-').reverse().join('/') : '---'}
                      </td>
                      <td className="py-3.5 text-right font-headline font-bold text-red-400">
                        R$ {item.valor.toFixed(2)}
                      </td>
                      <td className="py-3.5 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          item.status === 'pago'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}>
                          {item.status === 'pago' ? 'Pago' : 'Pendente'}
                        </span>
                      </td>
                      <td className="py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {item.status !== 'pago' && (
                            <button
                              onClick={() => handlePayPagar(item.id, item.descricao)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-[10px] inline-flex items-center gap-1 shadow-xs"
                            >
                              <CheckCircle2 className="w-3 h-3" /> Pagar
                            </button>
                          )}
                          <button
                            onClick={() => handleDeletePagar(item.id, item.descricao)}
                            className="p-1 hover:bg-red-500/10 text-zinc-500 hover:text-red-400 rounded transition-colors"
                            title="Excluir"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= ABA 3: CONTAS A RECEBER ================= */}
      {activeTab === 'receber' && (
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6 shadow-lg space-y-4 animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-white font-headline uppercase tracking-wider flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                Contas a Receber (Procedimentos & Sinais)
              </h3>
              <p className="text-xs text-zinc-400">Entradas por atendimentos de tatuagem, piercing e split automático</p>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800 text-xs">
                <button
                  onClick={() => setFilterReceber('todos')}
                  className={`px-2.5 py-1 rounded-lg ${filterReceber === 'todos' ? 'bg-zinc-800 text-white font-bold' : 'text-zinc-400'}`}
                >
                  Todos
                </button>
                <button
                  onClick={() => setFilterReceber('pendente')}
                  className={`px-2.5 py-1 rounded-lg ${filterReceber === 'pendente' ? 'bg-amber-500/20 text-amber-300 font-bold' : 'text-zinc-400'}`}
                >
                  Pendentes
                </button>
                <button
                  onClick={() => setFilterReceber('pago')}
                  className={`px-2.5 py-1 rounded-lg ${filterReceber === 'pago' ? 'bg-emerald-500/20 text-emerald-300 font-bold' : 'text-zinc-400'}`}
                >
                  Recebidos
                </button>
              </div>

              <button
                onClick={() => setIsModalReceberOpen(true)}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold font-headline flex items-center gap-1.5 transition-all shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                Nova Receita
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[10px] text-zinc-400 uppercase tracking-wider border-b border-zinc-800">
                <tr>
                  <th className="pb-3 font-semibold">Cliente & Serviço</th>
                  <th className="pb-3 font-semibold">Tatuador / Indicador</th>
                  <th className="pb-3 font-semibold text-right">Valor Total</th>
                  <th className="pb-3 font-semibold text-right">Lucro Estúdio</th>
                  <th className="pb-3 font-semibold text-center">Status</th>
                  <th className="pb-3 font-semibold text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {filteredReceber.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-zinc-500">
                      Nenhum recebimento cadastrado. Clique em "+ Nova Receita" para registrar.
                    </td>
                  </tr>
                ) : (
                  filteredReceber.map((item) => (
                    <tr key={item.id} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="py-3.5 pr-4">
                        <div className="font-semibold text-zinc-200">{item.cliente}</div>
                        <div className="text-[11px] text-zinc-500">{item.descricao}</div>
                      </td>
                      <td className="py-3.5 pr-4">
                        <div className="text-zinc-300">{item.artistaNome || 'Markinhos'} (60%)</div>
                        {item.indicadorNome && (
                          <div className="text-[10px] text-amber-400 font-bold">
                            Indicação: {item.indicadorNome} (10%)
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 text-right font-headline font-bold text-zinc-200">
                        R$ {item.valor.toFixed(2)}
                        {item.valorSinal ? (
                          <div className="text-[10px] text-emerald-400 font-normal">Sinal: R$ {item.valorSinal.toFixed(2)}</div>
                        ) : null}
                      </td>
                      <td className="py-3.5 text-right font-headline font-bold text-emerald-400">
                        R$ {(item.lucroEstudio || item.valor * 0.3).toFixed(2)}
                      </td>
                      <td className="py-3.5 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          item.status === 'pago'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : item.status === 'sinal_pago'
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}>
                          {item.status === 'pago' ? 'Quitado' : item.status === 'sinal_pago' ? 'Sinal Pago' : 'Pendente'}
                        </span>
                      </td>
                      <td className="py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {item.status !== 'pago' && (
                            <button
                              onClick={() => handlePayReceber(item.id, item.cliente)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-[10px] inline-flex items-center gap-1 shadow-xs"
                            >
                              <CheckCircle2 className="w-3 h-3" /> Quitar
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteReceber(item.id, item.cliente)}
                            className="p-1 hover:bg-red-500/10 text-zinc-500 hover:text-red-400 rounded transition-colors"
                            title="Excluir"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= ABA 4: COMISSÕES INDICA AÍ ================= */}
      {activeTab === 'comissoes' && (
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6 shadow-lg space-y-4 animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-white font-headline uppercase tracking-wider flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-400" />
                Livro de Comissões e Repasses (Indica Aí)
              </h3>
              <p className="text-xs text-zinc-400">Repasses gerados para afiliados e indicadores com baixa direta em Pix</p>
            </div>

            <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800 text-xs">
              <button
                onClick={() => setFilterComissao('todos')}
                className={`px-2.5 py-1 rounded-lg ${filterComissao === 'todos' ? 'bg-zinc-800 text-white font-bold' : 'text-zinc-400'}`}
              >
                Todas
              </button>
              <button
                onClick={() => setFilterComissao('pending')}
                className={`px-2.5 py-1 rounded-lg ${filterComissao === 'pending' ? 'bg-amber-500/20 text-amber-300 font-bold' : 'text-zinc-400'}`}
              >
                Pendentes
              </button>
              <button
                onClick={() => setFilterComissao('paid')}
                className={`px-2.5 py-1 rounded-lg ${filterComissao === 'paid' ? 'bg-emerald-500/20 text-emerald-300 font-bold' : 'text-zinc-400'}`}
              >
                Pagas
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[10px] text-zinc-400 uppercase tracking-wider border-b border-zinc-800">
                <tr>
                  <th className="pb-3 font-semibold">Cliente & Serviço</th>
                  <th className="pb-3 font-semibold">Indicador / Afiliado</th>
                  <th className="pb-3 font-semibold text-right">Valor Serviço</th>
                  <th className="pb-3 font-semibold text-right">Comissão (R$)</th>
                  <th className="pb-3 font-semibold text-center">Status</th>
                  <th className="pb-3 font-semibold text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {filteredComissoes.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-zinc-500">
                      Nenhum registro de comissão encontrado.
                    </td>
                  </tr>
                ) : (
                  filteredComissoes.map((comm) => (
                    <tr key={comm.id} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="py-3.5 pr-4">
                        <div className="font-semibold text-zinc-200">{comm.clientName}</div>
                        <div className="text-[11px] text-zinc-500">{comm.serviceDescription}</div>
                      </td>
                      <td className="py-3.5 pr-4">
                        <div className="font-medium text-amber-300">{comm.referrerName || 'Indica Aí'}</div>
                        <div className="text-[10px] text-zinc-500">
                          {comm.referralCode ? `Código: ${comm.referralCode}` : 'Link VIP'}
                        </div>
                      </td>
                      <td className="py-3.5 text-right font-medium text-zinc-300">
                        R$ {comm.serviceValue.toFixed(2)}
                      </td>
                      <td className="py-3.5 text-right font-headline font-bold text-amber-400">
                        R$ {comm.commissionAmount.toFixed(2)}
                        <span className="text-[10px] text-zinc-500 font-normal ml-1">({comm.commissionRate}%)</span>
                      </td>
                      <td className="py-3.5 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          comm.status === 'paid' 
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}>
                          {comm.status === 'paid' ? 'Pago' : 'Pendente'}
                        </span>
                      </td>
                      <td className="py-3.5 text-right">
                        {comm.status !== 'paid' ? (
                          <button
                            onClick={() => handlePayCommission(comm)}
                            disabled={actionLoading}
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
      )}

      {/* ================= MODAL: NOVA CONTA A PAGAR ================= */}
      {isModalPagarOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h3 className="text-base font-bold font-headline text-white uppercase flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-red-400" />
                Cadastrar Conta a Pagar (Despesa)
              </h3>
              <button onClick={() => setIsModalPagarOpen(false)} className="text-zinc-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Botão de Leitura de Comprovante com IA */}
            <button
              type="button"
              onClick={() => setScannerTarget('pagar')}
              className="w-full py-2 px-3 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/35 text-purple-200 text-xs font-semibold flex items-center justify-center gap-2 transition-all active:scale-98 shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              Ler Comprovante com IA (Preencher Automático)
            </button>

            <form onSubmit={handleSavePagar} className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-400 mb-1 font-semibold">Descrição do Gasto *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Compra de Tintas Black e Agulhas"
                  value={novoPagar.descricao}
                  onChange={(e) => setNovoPagar({ ...novoPagar, descricao: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-white outline-none focus:border-red-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 mb-1 font-semibold">Valor (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={novoPagar.valor}
                    onChange={(e) => setNovoPagar({ ...novoPagar, valor: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-white outline-none focus:border-red-500 font-headline font-bold"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1 font-semibold">Data Vencimento *</label>
                  <input
                    type="date"
                    required
                    value={novoPagar.vencimento}
                    onChange={(e) => setNovoPagar({ ...novoPagar, vencimento: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-white outline-none focus:border-red-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 mb-1 font-semibold">Categoria</label>
                  <select
                    value={novoPagar.categoria}
                    onChange={(e: any) => setNovoPagar({ ...novoPagar, categoria: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-white outline-none focus:border-red-500"
                  >
                    <option value="material">Material de Tattoo</option>
                    <option value="aluguel">Aluguel do Espaço</option>
                    <option value="energia_agua">Energia / Água / Net</option>
                    <option value="equipamentos">Equipamentos / Máquinas</option>
                    <option value="marketing">Marketing / Anúncios</option>
                    <option value="impostos">Impostos / Contabilidade</option>
                    <option value="outro">Outro Custo</option>
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1 font-semibold">Forma de Pagamento</label>
                  <select
                    value={novoPagar.formaPgto}
                    onChange={(e: any) => setNovoPagar({ ...novoPagar, formaPgto: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-white outline-none focus:border-red-500"
                  >
                    <option value="pix">Pix</option>
                    <option value="boleto">Boleto Bancário</option>
                    <option value="cartao_credito">Cartão de Crédito</option>
                    <option value="dinheiro">Dinheiro</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 mb-1 font-semibold">Fornecedor / Favorecido</label>
                  <input
                    type="text"
                    placeholder="Ex: Art Tattoo Supplies"
                    value={novoPagar.fornecedor}
                    onChange={(e) => setNovoPagar({ ...novoPagar, fornecedor: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-white outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1 font-semibold">Status Inicial</label>
                  <select
                    value={novoPagar.status}
                    onChange={(e: any) => setNovoPagar({ ...novoPagar, status: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-white outline-none focus:border-red-500"
                  >
                    <option value="pendente">Pendente (A Pagar)</option>
                    <option value="pago">Já Pago (Baixa Imediata)</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsModalPagarOpen(false)}
                  className="px-4 py-2 rounded-xl text-zinc-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold font-headline transition-all"
                >
                  Salvar Despesa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: NOVA CONTA A RECEBER ================= */}
      {isModalReceberOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h3 className="text-base font-bold font-headline text-white uppercase flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                Cadastrar Receita / Procedimento
              </h3>
              <button onClick={() => setIsModalReceberOpen(false)} className="text-zinc-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Botão de Leitura de Comprovante com IA */}
            <button
              type="button"
              onClick={() => setScannerTarget('receber')}
              className="w-full py-2 px-3 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/35 text-purple-200 text-xs font-semibold flex items-center justify-center gap-2 transition-all active:scale-98 shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              Ler Comprovante PIX do Cliente com IA
            </button>

            <form onSubmit={handleSaveReceber} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 mb-1 font-semibold">Nome do Cliente *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: João da Silva"
                    value={novoReceber.cliente}
                    onChange={(e) => setNovoReceber({ ...novoReceber, cliente: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-white outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1 font-semibold">Telefone / WhatsApp</label>
                  <input
                    type="text"
                    placeholder="11999998888"
                    value={novoReceber.clienteTelefone}
                    onChange={(e) => setNovoReceber({ ...novoReceber, clienteTelefone: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-white outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 mb-1 font-semibold">Descrição do Procedimento *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Tatuagem Fechamento de Braço Blackwork"
                  value={novoReceber.descricao}
                  onChange={(e) => setNovoReceber({ ...novoReceber, descricao: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-white outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 mb-1 font-semibold">Valor Total (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={novoReceber.valor}
                    onChange={(e) => setNovoReceber({ ...novoReceber, valor: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-white outline-none focus:border-emerald-500 font-headline font-bold"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1 font-semibold">Sinal Antecipado (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Ex: 200.00"
                    value={novoReceber.valorSinal}
                    onChange={(e) => setNovoReceber({ ...novoReceber, valorSinal: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-white outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 mb-1 font-semibold">Forma de Pagamento</label>
                  <select
                    value={novoReceber.formaPgto}
                    onChange={(e: any) => setNovoReceber({ ...novoReceber, formaPgto: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-white outline-none focus:border-emerald-500"
                  >
                    <option value="pix">Pix</option>
                    <option value="cartao_credito">Cartão de Crédito</option>
                    <option value="cartao_debito">Cartão de Débito</option>
                    <option value="dinheiro">Dinheiro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1 font-semibold">Status do Recebimento</label>
                  <select
                    value={novoReceber.status}
                    onChange={(e: any) => setNovoReceber({ ...novoReceber, status: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-white outline-none focus:border-emerald-500"
                  >
                    <option value="pago">Quitado / Total Recebido</option>
                    <option value="sinal_pago">Sinal Pago (Restante no dia)</option>
                    <option value="pendente">Pendente Total</option>
                  </select>
                </div>
              </div>

              {/* Bloco de Split & Indicação */}
              <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-zinc-300">Cliente veio por Indicação (Indica Aí)?</span>
                  <input
                    type="checkbox"
                    checked={novoReceber.hasIndicador}
                    onChange={(e) => setNovoReceber({ ...novoReceber, hasIndicador: e.target.checked })}
                    className="w-4 h-4 accent-amber-400"
                  />
                </div>

                {novoReceber.hasIndicador && (
                  <div>
                    <label className="block text-zinc-400 mb-1 font-semibold">Nome ou Código do Indicador</label>
                    <input
                      type="text"
                      placeholder="Ex: Camila Silva ou CODIGO10"
                      value={novoReceber.indicadorNome}
                      onChange={(e) => setNovoReceber({ ...novoReceber, indicadorNome: e.target.value })}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2 text-white outline-none focus:border-amber-400"
                    />
                  </div>
                )}

                {/* Previsão do Split em tempo real */}
                {Number(novoReceber.valor) > 0 && (
                  <div className="pt-2 border-t border-zinc-800/60 grid grid-cols-3 gap-2 text-center text-[10px]">
                    <div className="p-1.5 bg-zinc-900 rounded-lg">
                      <div className="text-zinc-500">Tatuador (60%)</div>
                      <div className="font-bold text-zinc-200">
                        R$ {((Number(novoReceber.valor) * 0.6)).toFixed(2)}
                      </div>
                    </div>
                    <div className="p-1.5 bg-zinc-900 rounded-lg">
                      <div className="text-amber-400 font-bold">Indica Aí ({novoReceber.hasIndicador ? '10%' : '0%'})</div>
                      <div className="font-bold text-amber-400">
                        R$ {(novoReceber.hasIndicador ? (Number(novoReceber.valor) * 0.1) : 0).toFixed(2)}
                      </div>
                    </div>
                    <div className="p-1.5 bg-zinc-900 rounded-lg">
                      <div className="text-emerald-400 font-bold">Estúdio ({novoReceber.hasIndicador ? '30%' : '40%'})</div>
                      <div className="font-bold text-emerald-400">
                        R$ {(Number(novoReceber.valor) - (Number(novoReceber.valor) * 0.6) - (novoReceber.hasIndicador ? Number(novoReceber.valor) * 0.1 : 0)).toFixed(2)}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsModalReceberOpen(false)}
                  className="px-4 py-2 rounded-xl text-zinc-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold font-headline transition-all"
                >
                  Salvar Receita
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Scanner de Comprovante PIX com IA */}
      <PixReceiptAiModal
        isOpen={!!scannerTarget}
        onClose={() => setScannerTarget(null)}
        onApplyToFinance={handleApplyScannerResult}
      />
    </div>
  );
}
