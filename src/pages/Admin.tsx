import React, { useState, useEffect, useMemo, Component, ErrorInfo, ReactNode } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, getDocs, doc, updateDoc, increment, serverTimestamp, addDoc, where, getDoc, setDoc, orderBy, limit } from 'firebase/firestore';
import { format } from 'date-fns';
import { UserRole, UserProfile, TransactionType, OperationType, Booking, NotificationType, UserTier, BookingStatus, StudioSettings, CreditTransaction, InviteCode, StudioRule, Campaign } from '../types';
import { handleFirestoreError } from '../lib/error-handler';
import { 
  Shield, Users, Calendar, Clock, Ban, DollarSign, Edit2, BarChart3, Ticket, ScrollText, 
  Trash2, ToggleLeft, ToggleRight, Plus, PlusCircle, Gift, Send, Settings, Terminal, Search,
  Menu, X, Sparkles, ChevronRight, MessageSquare, Layers, Wand2, CheckCircle2, ChevronDown, 
  AlertCircle, RefreshCw, Camera, Share2, PanelLeftClose, PanelLeft, Globe, GitFork, Award, ExternalLink,
  BarChart2, Target
} from 'lucide-react';
import { cn } from '../lib/utils';
import AdminDashboard from './AdminDashboard';
import { creditService } from '../lib/creditService';
import UnifiedCalendar from '../components/admin/UnifiedCalendar';
import { AdminSettings } from '../components/admin/AdminSettings';
import { whatsappService } from '../lib/whatsappService';
import { cloudBotService } from '../lib/cloudBotService';
import TattooEngineModule from '../components/studio/TattooEngineModule';
import GaleriaIA from './GaleriaIA';
import ReferralTree from '../components/network/ReferralTree';
import { buildReferralTree } from '../lib/referralUtils';
import { ThemeToggleButton } from '../components/ui/ThemeToggleButton';

// Error Boundary isolador por módulo
class ModuleErrorBoundary extends Component<{ children: ReactNode; moduleName: string }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: ReactNode; moduleName: string }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`Erro no módulo ${this.props.moduleName}:`, error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 bg-zinc-900/80 border border-red-500/20 rounded-2xl text-center space-y-4 my-4">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto" />
          <h4 className="font-headline font-black text-white text-base uppercase tracking-wider">
            Módulo {this.props.moduleName} em Manutenção
          </h4>
          <p className="text-xs text-zinc-400 max-w-md mx-auto">
            {this.state.error?.message || 'Ocorreu um imprevisto ao renderizar este bloco.'}
          </p>
          <button 
            type="button"
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-4 py-2 bg-primary-fixed text-black font-headline font-black text-xs uppercase rounded-xl inline-flex items-center gap-2 hover:opacity-90"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Recarregar Bloco
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

type MainModule = 'agenda' | 'indicaai' | 'studio' | 'galeria' | 'system';
type AgendaSubTab = 'calendar' | 'members' | 'hours';
type IndicaSubTab = 'dashboard' | 'credits' | 'campaigns' | 'invites' | 'rules' | 'tree';
type SystemSubTab = 'whatsapp' | 'logs';

export default function Admin() {
  const { isAdmin, user } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [invites, setInvites] = useState<InviteCode[]>([]);
  const [rules, setRules] = useState<StudioRule[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [automationLogs, setAutomationLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modular Super-App Navigation States
  const [currentModule, setCurrentModule] = useState<MainModule>('agenda');
  const [agendaSubTab, setAgendaSubTab] = useState<AgendaSubTab>('calendar');
  const [indicaSubTab, setIndicaSubTab] = useState<IndicaSubTab>('dashboard');
  const [systemSubTab, setSystemSubTab] = useState<SystemSubTab>('whatsapp');
  const [galeriaSubTab, setGaleriaSubTab] = useState<'calendario' | 'agendamentos' | 'insights' | 'trimestre' | 'estudio'>('calendario');
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Cascata (Accordion de Categorias Abertas)
  const [expandedCategories, setExpandedCategories] = useState<{ [key: string]: boolean }>({
    agenda: true,
    indicaai: true,
    studio: true,
    galeria: true,
    system: true
  });

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  // Modal & Form States (100% Preserved)
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [editingRule, setEditingRule] = useState<Partial<StudioRule> | null>(null);
  const [newInvite, setNewInvite] = useState({ code: '', maxUses: 10, expiresInDays: '' });
  const [editingCampaign, setEditingCampaign] = useState<Partial<Campaign> | null>(null);
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustDesc, setAdjustDesc] = useState('');
  const [adjusting, setAdjusting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [rescheduleData, setRescheduleData] = useState({ date: '', time: '' });
  const [newBlock, setNewBlock] = useState({ date: '', start: '', end: '', label: '' });

  // Tree & Referral Management States
  const [selectedTreeUserUid, setSelectedTreeUserUid] = useState<string>('');
  const [treeSearchQuery, setTreeSearchQuery] = useState<string>('');
  const [reassignModalUser, setReassignModalUser] = useState<{ uid: string; name: string; currentReferrerUid?: string } | null>(null);
  const [newReferrerUid, setNewReferrerUid] = useState<string>('');
  const [savingReassign, setSavingReassign] = useState(false);
  const [bonusModalUser, setBonusModalUser] = useState<{ uid: string; name: string } | null>(null);
  const [bonusAmount, setBonusAmount] = useState('');
  const [bonusReason, setBonusReason] = useState('');
  const [savingBonus, setSavingBonus] = useState(false);

  const [settings, setSettings] = useState<StudioSettings>({
    workingDays: [1, 2, 3, 4, 5, 6],
    workingHours: { start: '09:00', end: '19:00' },
    durations: { Pequena: 60, Média: 120, Grande: 240 },
    blockedDates: [], blockedIntervals: [], maxSessionsPerDay: 5, adminIds: [],
    allowIndicatorBooking: true, allowArtistBooking: true,
    automation: {
      evolutionBaseUrl: 'https://p01--evolution--6n2dx6dsdlsf.code.run',
      evolutionApiKey: '020F2F224360-40F7-B022-D17AB8E529E2',
      evolutionInstance: 'wats',
      reminderValue: 24, reminderUnit: 'hours',
      followUpValue: 7, followUpUnit: 'days',
      enabled: false, confirmationEnabled: false, reminderEnabled: false, followUpEnabled: false
    }
  });

  const filteredUsers = useMemo(() => {
    const q = (searchQuery || '').toLowerCase().trim();
    return (users || [])
      .filter(u => {
        if (!q) return true;
        const nameMatch = (u.name || '').toLowerCase().includes(q);
        const phoneMatch = (u.phone || '').replace(/\D/g, '').includes(q.replace(/\D/g, ''));
        return nameMatch || phoneMatch;
      })
      .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pt-BR', { sensitivity: 'base' }));
  }, [users, searchQuery]);

  const runAutomationSync = async (currentBookings: Booking[]) => {
    if (!settings.automation?.enabled) return;
    cloudBotService.triggerBot();
  };

  const fetchData = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const usersSnap = await getDocs(collection(db, 'users'));
      const fetchedUsers = usersSnap.docs
        .map(d => ({ uid: d.id, ...d.data() } as UserProfile))
        .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pt-BR', { sensitivity: 'base' }));
      setUsers(fetchedUsers);

      const bookingsSnap = await getDocs(collection(db, 'bookings'));
      const fetched = bookingsSnap.docs
        .map(d => ({ id: d.id, ...d.data() } as Booking))
        .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
      setBookings(fetched);

      const txsSnap = await getDocs(collection(db, 'transactions'));
      setTransactions(txsSnap.docs.map(d => ({ id: d.id, ...d.data() } as CreditTransaction)));

      const invitesSnap = await getDocs(collection(db, 'invites'));
      setInvites(invitesSnap.docs.map(d => ({ id: d.id, ...d.data() } as InviteCode)));

      const rulesSnap = await getDocs(query(collection(db, 'studio_rules'), orderBy('order', 'asc')));
      setRules(rulesSnap.docs.map(d => ({ id: d.id, ...d.data() } as StudioRule)));

      const campaignsSnap = await getDocs(collection(db, 'campaigns'));
      setCampaigns(campaignsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Campaign)));

      const logsSnap = await getDocs(query(collection(db, 'automation_logs'), orderBy('timestamp', 'desc'), limit(20)));
      setAutomationLogs(logsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) { 
      console.warn('Firestore fetch notice:', err); 
      handleFirestoreError(err, OperationType.LIST, 'admin/data'); 
    }
    finally { if (!isSilent) setLoading(false); }
  };

  const fetchSettings = async () => {
    try {
      const settingsSnap = await getDoc(doc(db, 'studio_settings', 'main'));
      if (settingsSnap.exists()) {
        const data = settingsSnap.data();
        setSettings(prev => ({
          ...prev, ...data,
          automation: { ...prev.automation, ...(data.automation || {}) },
          whatsappTemplates: { ...prev.whatsappTemplates, ...(data.whatsappTemplates || {}) }
        }));
      }
    } catch (err) { console.error('Erro settings:', err); }
  };

  useEffect(() => {
    fetchData();
    fetchSettings();
    const interval = setInterval(() => {
      fetchData(true);
      fetchSettings();
    }, 60000);
    return () => clearInterval(interval);
  }, [isAdmin, settings?.automation?.enabled]);

  const handleSendWhatsApp = (booking: Booking, type: 'confirmacao' | 'lembrete' | 'followup' = 'confirmacao') => {
    let phone = booking.userPhone || users.find(u => u.uid === booking.userId)?.phone;
    if (!phone) phone = prompt("Telefone não encontrado. Digite o WhatsApp (Ex: 11999999999):");
    if (!phone) return;
    phone = phone.replace(/\D/g, '');
    if (!phone.startsWith('55') && phone.length <= 11) phone = `55${phone}`;
    const templates = settings.whatsappTemplates || {};
    const template = templates[type] || (type === 'confirmacao' ? "Olá {cliente}, seu agendamento está confirmado!" : type === 'lembrete' ? "Oi {cliente}, lembrando da sua tattoo amanhã!" : "Olá {cliente}, como está a cicatrização?");
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(whatsappService.formatMessage(template, booking))}`, '_blank');
  };

  const handleUpdateSettings = async () => {
    try {
      const finalSettings = {
        ...settings,
        durations: settings.durations || { Pequena: 60, Média: 120, Grande: 240 },
        blockedIntervals: settings.blockedIntervals || [],
        allowIndicatorBooking: settings.allowIndicatorBooking ?? true,
        allowArtistBooking: settings.allowArtistBooking ?? true,
        whatsappTemplates: settings.whatsappTemplates || {},
        automation: settings.automation || {}
      };
      await setDoc(doc(db, 'studio_settings', 'main'), finalSettings);
      alert('Configurações salvas com sucesso!');
    } catch (err) { alert('Erro ao salvar: ' + (err as any).message); }
  };

  const handleStatusChange = async (booking: Booking, nextStatus: BookingStatus, customData: any = {}) => {
    try {
      const isReschedule = nextStatus === BookingStatus.RESCHEDULED;
      const updateData: any = { status: nextStatus, ...customData };
      if (isReschedule) {
        updateData.confirmationSent = false;
        updateData.reminderSent = false;
        updateData.followUpSent = false;
      }
      await updateDoc(doc(db, 'bookings', booking.id), updateData);
      
      if (isReschedule || nextStatus === BookingStatus.APPROVED) {
        whatsappService.sendBookingConfirmation({
          ...booking,
          ...customData,
          status: nextStatus
        }, settings);
      }

      cloudBotService.triggerBot();
      fetchData(true);
      setSelectedBooking(null);
    } catch (err) { console.error(err); }
  };

  const handleCompleteTattoo = async (booking: Booking) => {
    try {
      await handleStatusChange(booking, BookingStatus.COMPLETED);
      const userBonus = 20;
      await updateDoc(doc(db, 'users', booking.userId), { creditsBalance: increment(userBonus) });
      const sixMonthsNow = new Date(); sixMonthsNow.setMonth(sixMonthsNow.getMonth() + 6);
      await addDoc(collection(db, 'transactions'), {
        userId: booking.userId,
        amount: userBonus,
        type: TransactionType.TATTOO_BONUS,
        description: `Bônus Conclusão Tattoo: ${booking.size}`,
        bookingId: booking.id,
        createdAt: serverTimestamp(),
        expiresAt: sixMonthsNow
      });
      alert(`✅ Tatuagem concluída com sucesso!`);
      fetchData(true);
    } catch (err) {
      console.error(err);
      alert("Erro ao concluir serviço.");
    }
  };

  const handleAdjustCredits = async () => {
    if (!selectedUser || !adjustAmount || !adjustDesc) return;
    setAdjusting(true);
    try {
      const amountNum = parseFloat(adjustAmount);
      await updateDoc(doc(db, 'users', selectedUser.uid), { creditsBalance: increment(amountNum) });
      const sixMonthsFromNow = new Date(); sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);
      await addDoc(collection(db, 'transactions'), {
        userId: selectedUser.uid,
        amount: amountNum,
        type: TransactionType.ADMIN_ADJUSTMENT,
        description: adjustDesc,
        createdAt: serverTimestamp(),
        expiresAt: sixMonthsFromNow
      });
      setSelectedUser(null); setAdjustAmount(''); setAdjustDesc(''); fetchData();
    } catch (err) { console.error(err); } finally { setAdjusting(false); }
  };

  const activeTreeRootUser = useMemo(() => {
    if (selectedTreeUserUid) {
      const found = users.find(u => u.uid === selectedTreeUserUid);
      if (found) return found;
    }
    return users[0] || ({
      uid: 'studio_root',
      name: 'Somos 1 Tattoo (Estúdio Central)',
      phone: '11999999999',
      role: UserRole.ADMIN,
      tier: UserTier.DIAMANTE,
      inviteCode: 'STUDIO',
      creditsBalance: 0,
      createdAt: new Date()
    } as UserProfile);
  }, [selectedTreeUserUid, users]);

  const adminReferralTree = useMemo(() => {
    return buildReferralTree(activeTreeRootUser, users, bookings, 3);
  }, [activeTreeRootUser, users, bookings]);

  const treeSearchFilteredUsers = useMemo(() => {
    const q = (treeSearchQuery || '').toLowerCase().trim();
    if (!q) return users.slice(0, 8);
    return users.filter(u => 
      (u.name || '').toLowerCase().includes(q) ||
      (u.phone || '').replace(/\D/g, '').includes(q.replace(/\D/g, '')) ||
      (u.inviteCode || '').toLowerCase().includes(q)
    ).slice(0, 10);
  }, [users, treeSearchQuery]);

  const handleSaveReassign = async () => {
    if (!reassignModalUser) return;
    if (newReferrerUid === reassignModalUser.uid) {
      alert("Um usuário não pode ser indicador de si mesmo.");
      return;
    }
    setSavingReassign(true);
    try {
      const targetUserDoc = doc(db, 'users', reassignModalUser.uid);
      const newRefVal = newReferrerUid.trim() ? newReferrerUid.trim() : null;
      await updateDoc(targetUserDoc, {
        referredBy: newRefVal
      });
      setUsers(prev => prev.map(u => u.uid === reassignModalUser.uid ? { ...u, referredBy: newRefVal || undefined } : u));
      alert("✅ Indicador/Pai na rede atualizado com sucesso!");
      setReassignModalUser(null);
      setNewReferrerUid('');
      fetchData(true);
    } catch (err: any) {
      console.error(err);
      alert("Erro ao reatribuir indicador: " + err.message);
    } finally {
      setSavingReassign(false);
    }
  };

  const handleSaveTreeBonus = async () => {
    if (!bonusModalUser || !bonusAmount || isNaN(Number(bonusAmount))) return;
    setSavingBonus(true);
    try {
      const amountNum = parseFloat(bonusAmount);
      await updateDoc(doc(db, 'users', bonusModalUser.uid), {
        creditsBalance: increment(amountNum)
      });
      const sixMonthsFromNow = new Date();
      sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);
      await addDoc(collection(db, 'transactions'), {
        userId: bonusModalUser.uid,
        amount: amountNum,
        type: TransactionType.REFERRAL_BONUS,
        description: bonusReason || 'Bônus Administrativo de Rede Multinível',
        createdAt: serverTimestamp(),
        expiresAt: sixMonthsFromNow
      });
      setUsers(prev => prev.map(u => u.uid === bonusModalUser.uid ? { ...u, creditsBalance: (u.creditsBalance || 0) + amountNum } : u));
      alert(`✅ Bônus de ${amountNum} créditos concedido com sucesso para ${bonusModalUser.name}!`);
      setBonusModalUser(null);
      setBonusAmount('');
      setBonusReason('');
      fetchData(true);
    } catch (err: any) {
      console.error(err);
      alert("Erro ao conceder bônus: " + err.message);
    } finally {
      setSavingBonus(false);
    }
  };

  const handleUpdateRule = async (rule: Partial<StudioRule>) => {
    try {
      if (rule.id) await updateDoc(doc(db, 'studio_rules', rule.id), rule as any);
      else await addDoc(collection(db, 'studio_rules'), { ...rule, active: true, order: rules.length + 1 });
      setEditingRule(null); fetchData();
    } catch (err) { console.error(err); }
  };

  const handleCreateInvite = async () => {
    if (!newInvite.code) return;
    try {
      let expiresAt: any = null;
      if (newInvite.expiresInDays) {
        const d = new Date(); d.setDate(d.getDate() + parseInt(newInvite.expiresInDays));
        expiresAt = d;
      }
      await setDoc(doc(db, 'invites', newInvite.code.trim()), {
        code: newInvite.code.trim(), createdAt: serverTimestamp(), expiresAt,
        maxUses: newInvite.maxUses, usesCount: 0, createdByAdmin: true, active: true
      });
      setNewInvite({ code: '', maxUses: 10, expiresInDays: '' }); fetchData();
    } catch (err) { console.error(err); }
  };

  const toggleInvite = async (inv: InviteCode) => { await updateDoc(doc(db, 'invites', inv.id), { active: !inv.active }); fetchData(); };
  const handleUpdateCampaign = async (camp: Partial<Campaign>) => {
    try {
      if (camp.id) await updateDoc(doc(db, 'campaigns', camp.id), camp as any);
      else await addDoc(collection(db, 'campaigns'), { ...camp, active: true, createdAt: serverTimestamp() });
      setEditingCampaign(null); fetchData();
    } catch (err) { console.error(err); }
  };
  const toggleCampaign = async (camp: Campaign) => { await updateDoc(doc(db, 'campaigns', camp.id), { active: !camp.active }); fetchData(); };
  const handleAddBlock = () => {
    if (!newBlock.date || !newBlock.start || !newBlock.end) return;
    setSettings({ ...settings, blockedIntervals: [...(settings.blockedIntervals || []), newBlock] });
    setNewBlock({ date: '', start: '', end: '', label: '' });
  };
  const handleRemoveBlock = (idx: number) => { setSettings({ ...settings, blockedIntervals: settings.blockedIntervals.filter((_, i) => i !== idx) }); };
  const handleTestWhatsApp = async () => {
    const ph = prompt("Número com DDD (Ex: 11999998888):");
    if (!ph) return;
    alert("Iniciando teste...");
    if (await whatsappService.sendMessage(ph, "🚀 Teste de Automação do IndicaAi!", settings)) alert("✅ Enviado!");
    else alert("❌ Falha no envio.");
  };

  const getStatusColor = (s: BookingStatus) => {
    switch (s) {
      case BookingStatus.PENDING_APPROVAL: return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/20';
      case BookingStatus.APPROVED: return 'bg-blue-500/20 text-blue-400 border-blue-500/20';
      case BookingStatus.REJECTED: return 'bg-red-500/20 text-red-500 border-red-500/20';
      case BookingStatus.DEPOSIT_PAID: return 'bg-green-500/20 text-green-400 border-green-500/20';
      case BookingStatus.COMPLETED: return 'bg-primary-fixed/20 text-primary-fixed border-primary-fixed/20';
      case BookingStatus.NO_SHOW: return 'bg-zinc-500/20 text-zinc-400 border-zinc-500/20';
      default: return 'bg-zinc-800 text-zinc-500';
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row pb-24 md:pb-0">
      
      {/* DESKTOP SIDEBAR (Menu Lateral com Cascata & Hambúrguer) */}
      <aside className={cn(
        "hidden md:flex flex-col bg-card border-r border-border transition-all duration-300 select-none z-30 shrink-0",
        sidebarCollapsed ? "w-20" : "w-80"
      )}>
        {/* Header da Sidebar com Botão Hambúrguer de Recolher */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          {!sidebarCollapsed ? (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSidebarCollapsed(true)}
                className="p-2 rounded-xl bg-muted hover:bg-muted/80 text-foreground transition-all"
                title="Recolher Menu Lateral"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2.5">
                <img src="/somos1-logo-official.png" alt="Somos 1 Tattoo Studio" className="w-8 h-8 rounded-lg object-contain bg-background p-0.5 border border-border shadow-xs" />
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-headline font-black text-sm tracking-wider text-foreground">SOMOS 1</span>
                    <span className="text-[8px] bg-foreground text-background font-black px-1.5 py-0.5 rounded font-headline tracking-wider">STUDIO</span>
                  </div>
                  <p className="text-[9px] text-muted-foreground font-headline font-bold uppercase tracking-widest">Tattoo Studio</p>
                </div>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setSidebarCollapsed(false)}
              className="p-2.5 rounded-xl bg-muted hover:bg-muted/80 text-foreground mx-auto transition-all"
              title="Expandir Menu Lateral"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Categorias em Cascata (Accordion) */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-hide">
          
          {/* ================= CATEGORIA 1: AGENDA & ATENDIMENTOS ================= */}
          <div className="border border-white/5 rounded-2xl bg-white/[0.01] overflow-hidden">
            <button
              type="button"
              onClick={() => toggleCategory('agenda')}
              className={cn(
                "w-full flex items-center justify-between p-3 transition-colors text-left",
                currentModule === 'agenda' ? "bg-primary-fixed/10 text-white" : "hover:bg-white/5 text-zinc-400"
              )}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                  <Calendar className="w-4 h-4" />
                </div>
                {!sidebarCollapsed && (
                  <div>
                    <h4 className="font-headline font-black text-xs uppercase tracking-wider text-white">Atendimentos & CRM</h4>
                    <p className="text-[9px] text-zinc-500 font-headline">Agenda, Clientes e Horários</p>
                  </div>
                )}
              </div>
              {!sidebarCollapsed && (
                <ChevronDown className={cn("w-4 h-4 text-zinc-500 transition-transform duration-200", expandedCategories.agenda ? "rotate-180 text-primary-fixed" : "")} />
              )}
            </button>

            {/* Sub-itens da Cascata */}
            {(!sidebarCollapsed && expandedCategories.agenda) && (
              <div className="p-2 pt-0 space-y-1 animate-in slide-in-from-top-2 duration-200">
                <button
                  type="button"
                  onClick={() => { setCurrentModule('agenda'); setAgendaSubTab('calendar'); }}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-headline font-bold transition-all text-left",
                    currentModule === 'agenda' && agendaSubTab === 'calendar'
                      ? "bg-foreground text-background shadow-xs font-black"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Calendário & Agenda</span>
                </button>

                <button
                  type="button"
                  onClick={() => { setCurrentModule('agenda'); setAgendaSubTab('members'); }}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-headline font-bold transition-all text-left",
                    currentModule === 'agenda' && agendaSubTab === 'members'
                      ? "bg-foreground text-background shadow-xs font-black"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Fichas de Clientes (A-Z)</span>
                </button>

                <button
                  type="button"
                  onClick={() => { setCurrentModule('agenda'); setAgendaSubTab('hours'); }}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-headline font-bold transition-all text-left",
                    currentModule === 'agenda' && agendaSubTab === 'hours'
                      ? "bg-foreground text-background shadow-xs font-black"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Horários & Bloqueios</span>
                </button>
              </div>
            )}
          </div>

          {/* ================= CATEGORIA 2: REDE INDICA AI ================= */}
          <div className="border border-white/5 rounded-2xl bg-white/[0.01] overflow-hidden">
            <button
              type="button"
              onClick={() => toggleCategory('indicaai')}
              className={cn(
                "w-full flex items-center justify-between p-3 transition-colors text-left",
                currentModule === 'indicaai' ? "bg-primary-fixed/10 text-white" : "hover:bg-white/5 text-zinc-400"
              )}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-yellow-500/20 text-yellow-400 flex items-center justify-center shrink-0">
                  <BarChart3 className="w-4 h-4" />
                </div>
                {!sidebarCollapsed && (
                  <div>
                    <h4 className="font-headline font-black text-xs uppercase tracking-wider text-white">Rede IndicaAi</h4>
                    <p className="text-[9px] text-zinc-500 font-headline">Multinível, Bônus & Fidelidade</p>
                  </div>
                )}
              </div>
              {!sidebarCollapsed && (
                <ChevronDown className={cn("w-4 h-4 text-zinc-500 transition-transform duration-200", expandedCategories.indicaai ? "rotate-180 text-primary-fixed" : "")} />
              )}
            </button>

            {/* Sub-itens da Cascata */}
            {(!sidebarCollapsed && expandedCategories.indicaai) && (
              <div className="p-2 pt-0 space-y-1 animate-in slide-in-from-top-2 duration-200">
                <button
                  type="button"
                  onClick={() => { setCurrentModule('indicaai'); setIndicaSubTab('dashboard'); }}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-headline font-bold transition-all text-left",
                    currentModule === 'indicaai' && indicaSubTab === 'dashboard'
                      ? "bg-foreground text-background shadow-xs font-black"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span>Métricas da Rede</span>
                </button>

                <button
                  type="button"
                  onClick={() => { setCurrentModule('indicaai'); setIndicaSubTab('credits'); }}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-headline font-bold transition-all text-left",
                    currentModule === 'indicaai' && indicaSubTab === 'credits'
                      ? "bg-foreground text-background shadow-xs font-black"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>Saldo & Ajustes de Créditos</span>
                </button>

                <button
                  type="button"
                  onClick={() => { setCurrentModule('indicaai'); setIndicaSubTab('tree'); }}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-headline font-bold transition-all text-left",
                    currentModule === 'indicaai' && indicaSubTab === 'tree'
                      ? "bg-foreground text-background shadow-xs font-black"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  <GitFork className="w-3.5 h-3.5" />
                  <span>Árvore & Auditoria</span>
                </button>

                <button
                  type="button"
                  onClick={() => { setCurrentModule('indicaai'); setIndicaSubTab('campaigns'); }}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-headline font-bold transition-all text-left",
                    currentModule === 'indicaai' && indicaSubTab === 'campaigns'
                      ? "bg-foreground text-background shadow-xs font-black"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  <Gift className="w-3.5 h-3.5" />
                  <span>Campanhas de Bônus VIP</span>
                </button>

                <button
                  type="button"
                  onClick={() => { setCurrentModule('indicaai'); setIndicaSubTab('invites'); }}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-headline font-bold transition-all text-left",
                    currentModule === 'indicaai' && indicaSubTab === 'invites'
                      ? "bg-foreground text-background shadow-xs font-black"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  <Ticket className="w-3.5 h-3.5" />
                  <span>Gerador de Convites</span>
                </button>

                <button
                  type="button"
                  onClick={() => { setCurrentModule('indicaai'); setIndicaSubTab('rules'); }}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-headline font-bold transition-all text-left",
                    currentModule === 'indicaai' && indicaSubTab === 'rules'
                      ? "bg-foreground text-background shadow-xs font-black"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  <ScrollText className="w-3.5 h-3.5" />
                  <span>Regras de Pontuação</span>
                </button>
              </div>
            )}
          </div>

          {/* ================= CATEGORIA 3: TATTOO ENGINE PRO ================= */}
          <div className="border border-amber-500/20 rounded-2xl bg-amber-500/[0.02] overflow-hidden">
            <button
              type="button"
              onClick={() => { setCurrentModule('studio'); toggleCategory('studio'); }}
              className={cn(
                "w-full flex items-center justify-between p-3 transition-colors text-left",
                currentModule === 'studio' ? "bg-amber-500/20 text-amber-400" : "hover:bg-white/5 text-zinc-400"
              )}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                {!sidebarCollapsed && (
                  <div>
                    <h4 className="font-headline font-black text-xs uppercase tracking-wider text-amber-400">Tattoo Engine Pro</h4>
                    <p className="text-[9px] text-zinc-500 font-headline">IA, Stencil & Canvas</p>
                  </div>
                )}
              </div>
              {!sidebarCollapsed && (
                <ChevronDown className={cn("w-4 h-4 text-zinc-500 transition-transform duration-200", expandedCategories.studio ? "rotate-180 text-amber-400" : "")} />
              )}
            </button>

            {/* Sub-itens da Cascata */}
            {(!sidebarCollapsed && expandedCategories.studio) && (
              <div className="p-2 pt-0 space-y-1 animate-in slide-in-from-top-2 duration-200">
                <button
                  type="button"
                  onClick={() => setCurrentModule('studio')}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-headline font-bold transition-all text-left",
                    currentModule === 'studio'
                      ? "bg-gradient-to-r from-yellow-500 to-amber-600 text-black shadow-md font-black"
                      : "text-zinc-400 hover:text-white hover:bg-white/5"
                  )}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Studio Criativo & Stencils</span>
                </button>
              </div>
            )}
          </div>

          {/* ================= CATEGORIA 4: GALERIA IA (NOVO MÓDULO) ================= */}
          <div className="border border-pink-500/20 rounded-2xl bg-pink-500/[0.02] overflow-hidden">
            <button
              type="button"
              onClick={() => { setCurrentModule('galeria'); toggleCategory('galeria'); }}
              className={cn(
                "w-full flex items-center justify-between p-3 transition-colors text-left",
                currentModule === 'galeria' ? "bg-pink-500/20 text-pink-400" : "hover:bg-white/5 text-zinc-400"
              )}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-pink-500/20 text-pink-400 flex items-center justify-center shrink-0">
                  <Camera className="w-4 h-4" />
                </div>
                {!sidebarCollapsed && (
                  <div>
                    <h4 className="font-headline font-black text-xs uppercase tracking-wider text-pink-400">Galeria IA Social</h4>
                    <p className="text-[9px] text-zinc-500 font-headline">Buffer, Postagens & Instagram</p>
                  </div>
                )}
              </div>
              {!sidebarCollapsed && (
                <ChevronDown className={cn("w-4 h-4 text-zinc-500 transition-transform duration-200", expandedCategories.galeria ? "rotate-180 text-pink-400" : "")} />
              )}
            </button>

            {/* Sub-itens da Cascata */}
            {(!sidebarCollapsed && expandedCategories.galeria) && (
              <div className="p-2 pt-0 space-y-1 animate-in slide-in-from-top-2 duration-200">
                <button
                  type="button"
                  onClick={() => { setCurrentModule('galeria'); setGaleriaSubTab('calendario'); }}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-headline font-bold transition-all text-left",
                    currentModule === 'galeria' && galeriaSubTab === 'calendario'
                      ? "bg-foreground text-background shadow-md font-black"
                      : "text-zinc-400 hover:text-white hover:bg-white/5"
                  )}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Galeria & Calendário</span>
                </button>

                <button
                  type="button"
                  onClick={() => { setCurrentModule('galeria'); setGaleriaSubTab('agendamentos'); }}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-headline font-bold transition-all text-left",
                    currentModule === 'galeria' && galeriaSubTab === 'agendamentos'
                      ? "bg-foreground text-background shadow-md font-black"
                      : "text-zinc-400 hover:text-white hover:bg-white/5"
                  )}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Agenda Buffer (Queue)</span>
                </button>

                <button
                  type="button"
                  onClick={() => { setCurrentModule('galeria'); setGaleriaSubTab('insights'); }}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-headline font-bold transition-all text-left",
                    currentModule === 'galeria' && galeriaSubTab === 'insights'
                      ? "bg-foreground text-background shadow-md font-black"
                      : "text-zinc-400 hover:text-white hover:bg-white/5"
                  )}
                >
                  <BarChart2 className="w-3.5 h-3.5" />
                  <span>Insights Instagram</span>
                </button>

                <button
                  type="button"
                  onClick={() => { setCurrentModule('galeria'); setGaleriaSubTab('trimestre'); }}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-headline font-bold transition-all text-left",
                    currentModule === 'galeria' && galeriaSubTab === 'trimestre'
                      ? "bg-foreground text-background shadow-md font-black"
                      : "text-zinc-400 hover:text-white hover:bg-white/5"
                  )}
                >
                  <Target className="w-3.5 h-3.5" />
                  <span>Planejamento 90 Dias</span>
                </button>

                <button
                  type="button"
                  onClick={() => { setCurrentModule('galeria'); setGaleriaSubTab('estudio'); }}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-headline font-bold transition-all text-left",
                    currentModule === 'galeria' && galeriaSubTab === 'estudio'
                      ? "bg-foreground text-background shadow-md font-black"
                      : "text-zinc-400 hover:text-white hover:bg-white/5"
                  )}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Estúdio Criativo IA</span>
                </button>
              </div>
            )}
          </div>

          {/* ================= CATEGORIA 5: SISTEMA & AUTOMAÇÃO ================= */}
          <div className="border border-white/5 rounded-2xl bg-white/[0.01] overflow-hidden">
            <button
              type="button"
              onClick={() => toggleCategory('system')}
              className={cn(
                "w-full flex items-center justify-between p-3 transition-colors text-left",
                currentModule === 'system' ? "bg-primary-fixed/10 text-white" : "hover:bg-white/5 text-zinc-400"
              )}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-green-500/20 text-green-400 flex items-center justify-center shrink-0">
                  <MessageSquare className="w-4 h-4" />
                </div>
                {!sidebarCollapsed && (
                  <div>
                    <h4 className="font-headline font-black text-xs uppercase tracking-wider text-white">Sistema & Robô</h4>
                    <p className="text-[9px] text-zinc-500 font-headline">WhatsApp 24/7 & Logs</p>
                  </div>
                )}
              </div>
              {!sidebarCollapsed && (
                <ChevronDown className={cn("w-4 h-4 text-zinc-500 transition-transform duration-200", expandedCategories.system ? "rotate-180 text-primary-fixed" : "")} />
              )}
            </button>

            {/* Sub-itens da Cascata */}
            {(!sidebarCollapsed && expandedCategories.system) && (
              <div className="p-2 pt-0 space-y-1 animate-in slide-in-from-top-2 duration-200">
                <button
                  type="button"
                  onClick={() => { setCurrentModule('system'); setSystemSubTab('whatsapp'); }}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-headline font-bold transition-all text-left",
                    currentModule === 'system' && systemSubTab === 'whatsapp'
                      ? "bg-foreground text-background shadow-xs font-black"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Robô WhatsApp 24/7</span>
                </button>

                <button
                  type="button"
                  onClick={() => { setCurrentModule('system'); setSystemSubTab('logs'); }}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-headline font-bold transition-all text-left",
                    currentModule === 'system' && systemSubTab === 'logs'
                      ? "bg-foreground text-background shadow-xs font-black"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  <Terminal className="w-3.5 h-3.5" />
                  <span>Logs do Robô</span>
                </button>
              </div>
            )}
          </div>

        </div>

        {/* Rodapé da Sidebar */}
        <div className="p-4 border-t border-white/5 flex items-center justify-between text-zinc-500 text-xs font-headline">
          {!sidebarCollapsed && <span>Super-App Ativo</span>}
          <button 
            type="button"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-2 hover:bg-white/5 rounded-lg text-zinc-400 hover:text-white mx-auto md:mx-0"
            title={sidebarCollapsed ? "Expandir Menu" : "Recolher Menu"}
          >
            <ChevronRight className={cn("w-4 h-4 transition-transform", sidebarCollapsed ? "" : "rotate-180")} />
          </button>
        </div>
      </aside>

      {/* MOBILE DRAWER */}
      {isMobileDrawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md" onClick={() => setIsMobileDrawerOpen(false)} />
          <div className="relative w-80 max-w-[85%] bg-card border-r border-border p-5 flex flex-col h-full z-10 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2.5">
                <img src="/somos1-logo-official.png" alt="Somos 1" className="w-8 h-8 rounded-lg object-contain bg-background p-0.5 border border-border shadow-xs" />
                <div>
                  <h3 className="font-headline font-black text-xs text-foreground">SOMOS 1 TATTOO</h3>
                  <p className="text-[8px] text-muted-foreground uppercase font-headline tracking-wider">Studio Central</p>
                </div>
              </div>
              <button onClick={() => setIsMobileDrawerOpen(false)} className="p-2 text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="pt-1 pb-1">
              <ThemeToggleButton className="w-full justify-center" />
            </div>

            <div className="flex-1 overflow-y-auto space-y-3">
              {/* Agenda */}
              <div className="border border-border rounded-xl p-2 bg-muted/20">
                <p className="text-[9px] font-headline font-black uppercase tracking-widest text-muted-foreground mb-1 px-1">1. Atendimentos</p>
                <button onClick={() => { setCurrentModule('agenda'); setAgendaSubTab('calendar'); setIsMobileDrawerOpen(false); }} className="w-full text-left p-2 rounded-lg text-xs font-headline font-bold text-foreground flex items-center gap-2 hover:bg-muted">
                  <Calendar className="w-3.5 h-3.5 text-foreground" /> Calendário
                </button>
                <button onClick={() => { setCurrentModule('agenda'); setAgendaSubTab('members'); setIsMobileDrawerOpen(false); }} className="w-full text-left p-2 rounded-lg text-xs font-headline font-bold text-foreground flex items-center gap-2 hover:bg-muted">
                  <Users className="w-3.5 h-3.5 text-foreground" /> Fichas de Clientes A-Z
                </button>
              </div>

              {/* IndicaAi */}
              <div className="border border-border rounded-xl p-2 bg-muted/20">
                <p className="text-[9px] font-headline font-black uppercase tracking-widest text-muted-foreground mb-1 px-1">2. Rede & Fidelidade</p>
                <button onClick={() => { setCurrentModule('indicaai'); setIndicaSubTab('dashboard'); setIsMobileDrawerOpen(false); }} className="w-full text-left p-2 rounded-lg text-xs font-headline font-bold text-foreground flex items-center gap-2 hover:bg-muted">
                  <BarChart3 className="w-3.5 h-3.5 text-foreground" /> Métricas & Rede
                </button>
                <button onClick={() => { setCurrentModule('indicaai'); setIndicaSubTab('credits'); setIsMobileDrawerOpen(false); }} className="w-full text-left p-2 rounded-lg text-xs font-headline font-bold text-foreground flex items-center gap-2 hover:bg-muted">
                  <DollarSign className="w-3.5 h-3.5 text-foreground" /> Saldo & Ajustes
                </button>
                <button onClick={() => { setCurrentModule('indicaai'); setIndicaSubTab('campaigns'); setIsMobileDrawerOpen(false); }} className="w-full text-left p-2 rounded-lg text-xs font-headline font-bold text-foreground flex items-center gap-2 hover:bg-muted">
                  <Gift className="w-3.5 h-3.5 text-foreground" /> Campanhas
                </button>
                <button onClick={() => { setCurrentModule('indicaai'); setIndicaSubTab('invites'); setIsMobileDrawerOpen(false); }} className="w-full text-left p-2 rounded-lg text-xs font-headline font-bold text-foreground flex items-center gap-2 hover:bg-muted">
                  <Ticket className="w-3.5 h-3.5 text-foreground" /> Convites VIP
                </button>
              </div>

              {/* Tattoo Engine */}
              <div className="border border-border rounded-xl p-2 bg-muted/20">
                <p className="text-[9px] font-headline font-black uppercase tracking-widest text-muted-foreground mb-1 px-1">3. Creative Suite</p>
                <button onClick={() => { setCurrentModule('studio'); setIsMobileDrawerOpen(false); }} className="w-full text-left p-2 rounded-lg text-xs font-headline font-bold text-foreground flex items-center gap-2 hover:bg-muted">
                  <Sparkles className="w-3.5 h-3.5 text-foreground" /> Tattoo Engine Pro
                </button>
              </div>

              {/* Galeria IA */}
              <div className="border border-border rounded-xl p-2 bg-muted/20">
                <p className="text-[9px] font-headline font-black uppercase tracking-widest text-muted-foreground mb-1 px-1">4. Galeria IA</p>
                <button onClick={() => { setCurrentModule('galeria'); setGaleriaSubTab('calendario'); setIsMobileDrawerOpen(false); }} className="w-full text-left p-2 rounded-lg text-xs font-headline font-bold text-foreground flex items-center gap-2 hover:bg-muted">
                  <Calendar className="w-3.5 h-3.5 text-foreground" /> Galeria & Calendário
                </button>
                <button onClick={() => { setCurrentModule('galeria'); setGaleriaSubTab('agendamentos'); setIsMobileDrawerOpen(false); }} className="w-full text-left p-2 rounded-lg text-xs font-headline font-bold text-foreground flex items-center gap-2 hover:bg-muted">
                  <Clock className="w-3.5 h-3.5 text-foreground" /> Agenda Buffer (Queue)
                </button>
                <button onClick={() => { setCurrentModule('galeria'); setGaleriaSubTab('insights'); setIsMobileDrawerOpen(false); }} className="w-full text-left p-2 rounded-lg text-xs font-headline font-bold text-foreground flex items-center gap-2 hover:bg-muted">
                  <BarChart2 className="w-3.5 h-3.5 text-foreground" /> Insights Instagram
                </button>
                <button onClick={() => { setCurrentModule('galeria'); setGaleriaSubTab('trimestre'); setIsMobileDrawerOpen(false); }} className="w-full text-left p-2 rounded-lg text-xs font-headline font-bold text-foreground flex items-center gap-2 hover:bg-muted">
                  <Target className="w-3.5 h-3.5 text-foreground" /> Planejamento 90 Dias
                </button>
                <button onClick={() => { setCurrentModule('galeria'); setGaleriaSubTab('estudio'); setIsMobileDrawerOpen(false); }} className="w-full text-left p-2 rounded-lg text-xs font-headline font-bold text-foreground flex items-center gap-2 hover:bg-muted">
                  <Sparkles className="w-3.5 h-3.5 text-foreground" /> Estúdio Criativo IA
                </button>
              </div>

              {/* Sistema */}
              <div className="border border-border rounded-xl p-2 bg-muted/20">
                <p className="text-[9px] font-headline font-black uppercase tracking-widest text-muted-foreground mb-1 px-1">5. Infraestrutura</p>
                <button onClick={() => { setCurrentModule('system'); setSystemSubTab('whatsapp'); setIsMobileDrawerOpen(false); }} className="w-full text-left p-2 rounded-lg text-xs font-headline font-bold text-foreground flex items-center gap-2 hover:bg-muted">
                  <MessageSquare className="w-3.5 h-3.5 text-foreground" /> WhatsApp 24/7 & Logs
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* TOP HEADER */}
        <header className="sticky top-0 z-20 bg-card/90 backdrop-blur-md border-b border-border px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              type="button"
              onClick={() => setIsMobileDrawerOpen(true)}
              className="md:hidden p-2 rounded-xl bg-muted border border-border text-foreground"
            >
              <Menu className="w-5 h-5" />
            </button>
            
            {/* Botão de abrir/fechar Sidebar no Desktop */}
            <button
              type="button"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="hidden md:flex p-2 rounded-xl bg-muted border border-border text-muted-foreground hover:text-foreground transition-all"
              title={sidebarCollapsed ? "Expandir Menu" : "Recolher Menu"}
            >
              {sidebarCollapsed ? <PanelLeft className="w-4 h-4 text-foreground" /> : <PanelLeftClose className="w-4 h-4" />}
            </button>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-headline font-black text-sm uppercase tracking-wider text-foreground">
                  {currentModule === 'agenda' && '📅 ATENDIMENTOS & AGENDA'}
                  {currentModule === 'indicaai' && '👑 PROGRAMA DE INDICAÇÃO & VIP'}
                  {currentModule === 'studio' && '🎨 TATTOO ENGINE PRO'}
                  {currentModule === 'galeria' && '📸 GALERIA IA & SOCIAL STUDIO'}
                  {currentModule === 'system' && '🤖 SISTEMA & AUTOMAÇÃO'}
                </h1>
                <span className="hidden sm:inline-block text-[9px] bg-muted text-foreground border border-border px-2 py-0.5 rounded-full font-headline font-black">
                  Robô Nuvem 24/7 Ativo
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground font-headline uppercase tracking-widest mt-0.5">
                Somos 1 Tattoo Studio • Painel Central
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <ThemeToggleButton />
            <button
              type="button"
              onClick={() => fetchData()}
              className="px-3 py-2 bg-muted hover:bg-muted/80 border border-border rounded-xl text-[10px] font-headline uppercase font-bold text-foreground transition-all flex items-center gap-1.5"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Atualizar</span>
            </button>
          </div>
        </header>

        {/* SUB-TABS NAVIGATION (Pills no Topo para Módulos de Múltiplas Funções) */}
        {currentModule !== 'studio' && (
          <div className="px-6 pt-3 pb-2 border-b border-border bg-background">
            <div className="flex gap-2 overflow-x-auto scrollbar-hide py-1">
              
              {/* Sub-abas de Galeria IA */}
              {currentModule === 'galeria' && (
                <>
                  <button
                    type="button"
                    onClick={() => setGaleriaSubTab('calendario')}
                    className={cn(
                      "px-4 py-2 rounded-xl text-xs font-headline font-black uppercase tracking-wider transition-all border shrink-0",
                      galeriaSubTab === 'calendario' ? "bg-foreground text-background border-foreground shadow-md" : "text-muted-foreground border-border bg-card hover:text-foreground"
                    )}
                  >
                    <Calendar className="w-3.5 h-3.5 inline mr-1.5" /> 📅 Galeria Mensal
                  </button>
                  <button
                    type="button"
                    onClick={() => setGaleriaSubTab('agendamentos')}
                    className={cn(
                      "px-4 py-2 rounded-xl text-xs font-headline font-black uppercase tracking-wider transition-all border shrink-0",
                      galeriaSubTab === 'agendamentos' ? "bg-foreground text-background border-foreground shadow-md" : "text-muted-foreground border-border bg-card hover:text-foreground"
                    )}
                  >
                    <Clock className="w-3.5 h-3.5 inline mr-1.5" /> ⚡ Agenda Buffer
                  </button>
                  <button
                    type="button"
                    onClick={() => setGaleriaSubTab('insights')}
                    className={cn(
                      "px-4 py-2 rounded-xl text-xs font-headline font-black uppercase tracking-wider transition-all border shrink-0",
                      galeriaSubTab === 'insights' ? "bg-foreground text-background border-foreground shadow-md" : "text-muted-foreground border-border bg-card hover:text-foreground"
                    )}
                  >
                    <BarChart2 className="w-3.5 h-3.5 inline mr-1.5" /> 📊 Insights Instagram
                  </button>
                  <button
                    type="button"
                    onClick={() => setGaleriaSubTab('trimestre')}
                    className={cn(
                      "px-4 py-2 rounded-xl text-xs font-headline font-black uppercase tracking-wider transition-all border shrink-0",
                      galeriaSubTab === 'trimestre' ? "bg-foreground text-background border-foreground shadow-md" : "text-muted-foreground border-border bg-card hover:text-foreground"
                    )}
                  >
                    <Target className="w-3.5 h-3.5 inline mr-1.5" /> 🎯 Trimestral (90d)
                  </button>
                  <button
                    type="button"
                    onClick={() => setGaleriaSubTab('estudio')}
                    className={cn(
                      "px-4 py-2 rounded-xl text-xs font-headline font-black uppercase tracking-wider transition-all border shrink-0",
                      galeriaSubTab === 'estudio' ? "bg-foreground text-background border-foreground shadow-md" : "text-muted-foreground border-border bg-card hover:text-foreground"
                    )}
                  >
                    <Sparkles className="w-3.5 h-3.5 inline mr-1.5" /> ✨ Estúdio IA
                  </button>
                </>
              )}
              
              {/* Sub-abas de Agenda */}
              {currentModule === 'agenda' && (
                <>
                  <button
                    type="button"
                    onClick={() => setAgendaSubTab('calendar')}
                    className={cn(
                      "px-4 py-2 rounded-xl text-xs font-headline font-black uppercase tracking-wider transition-all border shrink-0",
                      agendaSubTab === 'calendar' ? "bg-foreground text-background border-foreground shadow-xs" : "text-muted-foreground border-border bg-card hover:text-foreground hover:bg-muted/50"
                    )}
                  >
                    <Calendar className="w-3.5 h-3.5 inline mr-1.5" /> Calendário & Agenda
                  </button>
                  <button
                    type="button"
                    onClick={() => setAgendaSubTab('members')}
                    className={cn(
                      "px-4 py-2 rounded-xl text-xs font-headline font-black uppercase tracking-wider transition-all border shrink-0",
                      agendaSubTab === 'members' ? "bg-foreground text-background border-foreground shadow-xs" : "text-muted-foreground border-border bg-card hover:text-foreground hover:bg-muted/50"
                    )}
                  >
                    <Users className="w-3.5 h-3.5 inline mr-1.5" /> Fichas de Clientes (A-Z)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAgendaSubTab('hours')}
                    className={cn(
                      "px-4 py-2 rounded-xl text-xs font-headline font-black uppercase tracking-wider transition-all border shrink-0",
                      agendaSubTab === 'hours' ? "bg-foreground text-background border-foreground shadow-xs" : "text-muted-foreground border-border bg-card hover:text-foreground hover:bg-muted/50"
                    )}
                  >
                    <Clock className="w-3.5 h-3.5 inline mr-1.5" /> Horários & Bloqueios
                  </button>
                </>
              )}

              {/* Sub-abas de IndicaAi */}
              {currentModule === 'indicaai' && (
                <>
                  <button
                    type="button"
                    onClick={() => setIndicaSubTab('dashboard')}
                    className={cn(
                      "px-4 py-2 rounded-xl text-xs font-headline font-black uppercase tracking-wider transition-all border shrink-0",
                      indicaSubTab === 'dashboard' ? "bg-foreground text-background border-foreground shadow-xs" : "text-muted-foreground border-border bg-card hover:text-foreground hover:bg-muted/50"
                    )}
                  >
                    <BarChart3 className="w-3.5 h-3.5 inline mr-1.5" /> Métricas da Rede
                  </button>
                  <button
                    type="button"
                    onClick={() => setIndicaSubTab('credits')}
                    className={cn(
                      "px-4 py-2 rounded-xl text-xs font-headline font-black uppercase tracking-wider transition-all border shrink-0",
                      indicaSubTab === 'credits' ? "bg-foreground text-background border-foreground shadow-xs" : "text-muted-foreground border-border bg-card hover:text-foreground hover:bg-muted/50"
                    )}
                  >
                    <DollarSign className="w-3.5 h-3.5 inline mr-1.5" /> Saldo & Ajustes
                  </button>
                  <button
                    type="button"
                    onClick={() => setIndicaSubTab('tree')}
                    className={cn(
                      "px-4 py-2 rounded-xl text-xs font-headline font-black uppercase tracking-wider transition-all border shrink-0",
                      indicaSubTab === 'tree' ? "bg-foreground text-background border-foreground shadow-xs" : "text-muted-foreground border-border bg-card hover:text-foreground hover:bg-muted/50"
                    )}
                  >
                    <GitFork className="w-3.5 h-3.5 inline mr-1.5" /> Árvore & Auditoria
                  </button>
                  <button
                    type="button"
                    onClick={() => setIndicaSubTab('campaigns')}
                    className={cn(
                      "px-4 py-2 rounded-xl text-xs font-headline font-black uppercase tracking-wider transition-all border shrink-0",
                      indicaSubTab === 'campaigns' ? "bg-foreground text-background border-foreground shadow-xs" : "text-muted-foreground border-border bg-card hover:text-foreground hover:bg-muted/50"
                    )}
                  >
                    <Gift className="w-3.5 h-3.5 inline mr-1.5" /> Campanhas VIP
                  </button>
                  <button
                    type="button"
                    onClick={() => setIndicaSubTab('invites')}
                    className={cn(
                      "px-4 py-2 rounded-xl text-xs font-headline font-black uppercase tracking-wider transition-all border shrink-0",
                      indicaSubTab === 'invites' ? "bg-foreground text-background border-foreground shadow-xs" : "text-muted-foreground border-border bg-card hover:text-foreground hover:bg-muted/50"
                    )}
                  >
                    <Ticket className="w-3.5 h-3.5 inline mr-1.5" /> Convites
                  </button>
                  <button
                    type="button"
                    onClick={() => setIndicaSubTab('rules')}
                    className={cn(
                      "px-4 py-2 rounded-xl text-xs font-headline font-black uppercase tracking-wider transition-all border shrink-0",
                      indicaSubTab === 'rules' ? "bg-foreground text-background border-foreground shadow-xs" : "text-muted-foreground border-border bg-card hover:text-foreground hover:bg-muted/50"
                    )}
                  >
                    <ScrollText className="w-3.5 h-3.5 inline mr-1.5" /> Regras de Pontuação
                  </button>
                </>
              )}

              {/* Sub-abas de Sistema */}
              {currentModule === 'system' && (
                <>
                  <button
                    type="button"
                    onClick={() => setSystemSubTab('whatsapp')}
                    className={cn(
                      "px-4 py-2 rounded-xl text-xs font-headline font-black uppercase tracking-wider transition-all border shrink-0",
                      systemSubTab === 'whatsapp' ? "bg-foreground text-background border-foreground shadow-xs" : "text-muted-foreground border-border bg-card hover:text-foreground hover:bg-muted/50"
                    )}
                  >
                    <MessageSquare className="w-3.5 h-3.5 inline mr-1.5" /> Automação WhatsApp 24/7
                  </button>
                  <button
                    type="button"
                    onClick={() => setSystemSubTab('logs')}
                    className={cn(
                      "px-4 py-2 rounded-xl text-xs font-headline font-black uppercase tracking-wider transition-all border shrink-0",
                      systemSubTab === 'logs' ? "bg-foreground text-background border-foreground shadow-xs" : "text-muted-foreground border-border bg-card hover:text-foreground hover:bg-muted/50"
                    )}
                  >
                    <Terminal className="w-3.5 h-3.5 inline mr-1.5" /> Logs em Tempo Real
                  </button>
                </>
              )}

            </div>
          </div>
        )}

        {/* VIEWPORT BODY */}
        <main className="flex-1 p-4 md:p-6 max-w-7xl mx-auto w-full">
          {loading ? (
            <div className="text-center py-20 text-zinc-500 font-headline uppercase tracking-widest animate-pulse">
              Carregando Módulos do Super-App...
            </div>
          ) : (
            <div>
              
              {/* ==================== MÓDULO 1: AGENDA & ATENDIMENTOS ==================== */}
              {currentModule === 'agenda' && (
                <div className="space-y-6">
                  {agendaSubTab === 'calendar' && (
                    <ModuleErrorBoundary moduleName="Calendário">
                      <div className="space-y-6">
                        <UnifiedCalendar bookings={bookings} settings={settings} onBookingCreated={() => fetchData(true)} onEditBooking={(b) => setSelectedBooking(b)} />
                        
                        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                          <h3 className="col-span-full font-headline text-sm uppercase tracking-widest text-primary-fixed mb-1">
                            Próximos Agendamentos & Ações Rápidas
                          </h3>
                          {bookings.slice(0, 10).map(b => (
                            <div key={b.id} className="glass-panel p-5 rounded-2xl border border-white/5 hover:border-white/10 transition-all">
                              <div className="flex justify-between items-start mb-4">
                                <div>
                                  <h3 className="font-headline text-sm font-black text-white uppercase tracking-wider">Tattoo {b.size}</h3>
                                  <p className="text-[10px] text-zinc-500 uppercase tracking-widest flex items-center gap-1 mt-0.5"><Clock className="w-3 h-3" /> {b.date} • {b.time}</p>
                                </div>
                                <div className="flex items-center">
                                  <span className={cn("text-[9px] font-headline uppercase tracking-tighter px-2.5 py-1 rounded-full border font-black", getStatusColor(b.status))}>{b.status.replace('_', ' ')}</span>
                                  <button onClick={() => handleSendWhatsApp(b)} className="p-2 bg-green-600/20 text-green-400 rounded-lg border border-green-600/30 hover:bg-green-600/30 transition-all ml-2" title="WhatsApp"><Send className="w-3 h-3" /></button>
                                  <button onClick={() => setSelectedBooking(b)} className="p-2 bg-zinc-800 text-zinc-400 rounded-lg border border-white/5 hover:bg-zinc-700 transition-all ml-1" title="Editar"><Settings className="w-3 h-3" /></button>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-4 mb-4 text-[10px] uppercase font-headline tracking-widest font-black">
                                <div className="bg-white/[0.03] p-3 rounded-xl border border-white/5"><p className="text-zinc-600 mb-1">Estimado</p><p className="text-white">R$ {b.priceEstimated}</p></div>
                                <div className="bg-white/[0.03] p-3 rounded-xl border border-white/5"><p className="text-zinc-600 mb-1">Sinal Pago</p><p className={b.depositPaid > 0 ? "text-primary-fixed" : "text-red-400"}>R$ {b.depositPaid}</p></div>
                              </div>
                              <div className="flex flex-wrap gap-2 pt-2 border-t border-white/5">
                                {b.status === BookingStatus.PENDING_APPROVAL && (<><button onClick={() => handleStatusChange(b, BookingStatus.APPROVED)} className="flex-1 bg-blue-600/20 text-blue-400 text-[10px] font-headline uppercase tracking-widest py-2 rounded-lg border border-blue-600/30 hover:bg-blue-600/30 font-black">Aprovar</button><button onClick={() => handleStatusChange(b, BookingStatus.REJECTED)} className="flex-1 bg-red-600/20 text-red-400 text-[10px] font-headline uppercase tracking-widest py-2 rounded-lg border border-blue-600/30 hover:bg-blue-600/30 font-black">Recusar</button></>)}
                                {b.status === BookingStatus.APPROVED && (<button onClick={() => handleStatusChange(b, BookingStatus.DEPOSIT_PAID, { depositPaid: 80 })} className="flex-1 bg-primary-fixed/20 text-primary-fixed text-[10px] font-headline uppercase tracking-widest py-2 rounded-lg border border-primary-fixed/30 hover:bg-primary-fixed/30 font-black">Confirmar Sinal (R$80)</button>)}
                                {(b.status === BookingStatus.DEPOSIT_PAID || b.status === BookingStatus.RESCHEDULED || b.status === BookingStatus.APPROVED) && (<button onClick={() => handleCompleteTattoo(b)} className="flex-1 bg-primary-fixed text-black text-[10px] font-headline uppercase tracking-widest py-2 rounded-lg hover:opacity-90 font-black shadow-lg shadow-primary-fixed/20 animate-pulse">✅ Concluir Serviço</button>)}
                                {b.status !== BookingStatus.COMPLETED && b.status !== BookingStatus.REJECTED && (<div className="flex gap-2 w-full mt-2"><button onClick={() => setSelectedBooking(b)} className="flex-1 bg-zinc-800 text-zinc-400 text-[10px] font-headline uppercase tracking-widest py-2 rounded-lg hover:bg-zinc-700 font-black">Reagendar</button><button onClick={() => handleStatusChange(b, BookingStatus.NO_SHOW)} className="px-4 bg-zinc-800 text-red-400 text-[10px] font-headline uppercase tracking-widest py-2 rounded-lg hover:bg-zinc-700 font-black">No-Show</button></div>)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </ModuleErrorBoundary>
                  )}

                  {agendaSubTab === 'members' && (
                    <ModuleErrorBoundary moduleName="Fichas de Clientes">
                      <div className="space-y-4">
                        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                          <div className="relative flex-1">
                            <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                            <input
                              type="text"
                              placeholder="Buscar cliente por nome ou WhatsApp..."
                              value={searchQuery}
                              onChange={e => setSearchQuery(e.target.value)}
                              className="w-full bg-zinc-900/90 border border-white/10 rounded-xl pl-10 pr-16 py-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-primary-fixed transition-all"
                            />
                            {searchQuery && (
                              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-white bg-zinc-800 px-2 py-1 rounded-md">Limpar</button>
                            )}
                          </div>
                          <div className="text-[10px] uppercase font-headline font-black text-zinc-500 flex items-center justify-end px-1">
                            {filteredUsers.length} de {users.length} cadastrados (A-Z)
                          </div>
                        </div>

                        {filteredUsers.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {filteredUsers.map(u => (
                              <div key={u.uid} className="glass-panel p-4 rounded-xl flex items-center justify-between border border-white/5 hover:border-white/15 transition-all">
                                <div className="flex items-center gap-4">
                                  <div className="w-12 h-12 rounded-full bg-zinc-800 border border-white/5 flex items-center justify-center text-primary-fixed font-headline font-black text-lg">
                                    {u.name?.charAt(0)?.toUpperCase() || '?'}
                                  </div>
                                  <div>
                                    <p className="font-bold text-white">{u.name || 'Sem nome'}</p>
                                    <p className="text-xs text-zinc-500">{u.phone} | {u.tier}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <div className="text-right">
                                    <p className="text-primary-fixed font-headline font-black">R$ {u.creditsBalance}</p>
                                    <button onClick={() => setSelectedUser(u)} className="text-zinc-500 hover:text-white transition-colors" title="Ajustar Saldo">
                                      <PlusCircle className="w-5 h-5" />
                                    </button>
                                  </div>
                                  <button
                                    onClick={() => {
                                      const ph = (u.phone || '').replace(/\D/g, '');
                                      window.open(`https://wa.me/${ph.startsWith('55') ? ph : '55'+ph}`, '_blank');
                                    }}
                                    className="p-3 bg-green-600/20 text-green-400 rounded-xl border border-green-600/30 hover:bg-green-600/30 transition-all"
                                    title="Conversar no WhatsApp"
                                  >
                                    <Send className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-12 text-center text-zinc-600 font-headline uppercase text-xs tracking-widest bg-zinc-900/30 border border-white/5 rounded-2xl">
                            Nenhum cliente encontrado para "{searchQuery}"
                          </div>
                        )}
                      </div>
                    </ModuleErrorBoundary>
                  )}

                  {agendaSubTab === 'hours' && (
                    <ModuleErrorBoundary moduleName="Configuração de Horários">
                      <div className="space-y-6">
                        <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-4">
                          <h3 className="font-headline text-sm uppercase tracking-widest text-primary-fixed">Bloqueio Rápido de Horários</h3>
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <input type="date" value={newBlock.date} onChange={e => setNewBlock({...newBlock, date: e.target.value})} className="bg-black/50 border border-white/10 rounded-xl p-3 text-xs" />
                            <input type="time" value={newBlock.start} onChange={e => setNewBlock({...newBlock, start: e.target.value})} className="bg-black/50 border border-white/10 rounded-xl p-3 text-xs" />
                            <input type="time" value={newBlock.end} onChange={e => setNewBlock({...newBlock, end: e.target.value})} className="bg-black/50 border border-white/10 rounded-xl p-3 text-xs" />
                            <button onClick={handleAddBlock} className="bg-primary-fixed text-black rounded-xl font-headline font-black uppercase text-xs py-3">Adicionar Bloqueio</button>
                          </div>
                        </div>
                        <AdminSettings settings={settings} setSettings={setSettings} handleUpdateSettings={handleUpdateSettings} newBlock={newBlock} setNewBlock={setNewBlock} handleAddBlock={handleAddBlock} handleRemoveBlock={handleRemoveBlock} onTestWhatsApp={handleTestWhatsApp} />
                      </div>
                    </ModuleErrorBoundary>
                  )}
                </div>
              )}

              {/* ==================== MÓDULO 2: REDE INDICA AI ==================== */}
              {currentModule === 'indicaai' && (
                <div className="space-y-6">
                  {indicaSubTab === 'dashboard' && (
                    <ModuleErrorBoundary moduleName="Dashboard da Rede">
                      <AdminDashboard users={users} bookings={bookings} transactions={transactions} invites={invites} />
                    </ModuleErrorBoundary>
                  )}

                  {indicaSubTab === 'credits' && (
                    <ModuleErrorBoundary moduleName="Saldo e Créditos">
                      <div className="space-y-4">
                        <div className="flex justify-between items-center mb-2">
                          <h3 className="font-headline text-sm uppercase tracking-widest text-primary-fixed">Gestão de Créditos e Saldo de Membros</h3>
                          <span className="text-xs text-zinc-500 font-headline uppercase">{users.length} membros na rede</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {users.map(u => (
                            <div key={u.uid} className="glass-panel p-4 rounded-xl flex items-center justify-between border border-white/5">
                              <div>
                                <p className="font-bold text-white">{u.name || 'Sem nome'}</p>
                                <p className="text-xs text-zinc-500">{u.phone} | Nível: {u.tier}</p>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="font-headline font-black text-primary-fixed text-sm">R$ {u.creditsBalance}</span>
                                <button onClick={() => setSelectedUser(u)} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-zinc-300">
                                  <PlusCircle className="w-5 h-5 text-primary-fixed" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </ModuleErrorBoundary>
                  )}

                  {indicaSubTab === 'tree' && (
                    <ModuleErrorBoundary moduleName="Árvore de Indicações & Auditoria">
                      <div className="space-y-6">
                        {/* Seletor & Filtro de Raiz */}
                        <div className="glass-panel p-5 rounded-2xl border border-white/5 space-y-4">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                              <h3 className="font-headline text-base uppercase tracking-wider text-white font-black flex items-center gap-2">
                                <GitFork className="w-5 h-5 text-primary-fixed" />
                                Auditoria & Árvore Multinível
                              </h3>
                              <p className="text-xs text-zinc-400 mt-1">
                                Inspecione a genealogia de 3 níveis, tatuagens geradas, comissões e reatribua indicadores da rede.
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() => { setSelectedTreeUserUid(''); setTreeSearchQuery(''); }}
                              className={cn(
                                "px-4 py-2.5 rounded-xl font-headline text-xs font-black uppercase tracking-wider transition-all border shrink-0",
                                !selectedTreeUserUid
                                  ? "bg-primary-fixed text-black border-primary-fixed shadow-md shadow-primary-fixed/20"
                                  : "border-white/10 text-zinc-300 hover:text-white bg-zinc-900/60"
                              )}
                            >
                              Ver Raiz Geral (Estúdio)
                            </button>
                          </div>

                          {/* Campo de Busca Rápida */}
                          <div className="space-y-2 pt-2 border-t border-white/5">
                            <label className="text-[10px] uppercase font-headline tracking-widest text-zinc-400 block">
                              Buscar usuário para inspecionar árvore específica:
                            </label>
                            <input
                              type="text"
                              value={treeSearchQuery}
                              onChange={e => setTreeSearchQuery(e.target.value)}
                              placeholder="Digite o nome, telefone ou código de convite..."
                              className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-primary-fixed/50 transition-colors"
                            />
                            {treeSearchFilteredUsers.length > 0 && (
                              <div className="flex flex-wrap gap-2 pt-1 max-h-32 overflow-y-auto custom-scrollbar">
                                {treeSearchFilteredUsers.map(u => (
                                  <button
                                    key={u.uid}
                                    type="button"
                                    onClick={() => setSelectedTreeUserUid(u.uid)}
                                    className={cn(
                                      "px-3 py-1.5 rounded-lg text-xs font-headline transition-all border flex items-center gap-2",
                                      selectedTreeUserUid === u.uid
                                        ? "bg-primary-fixed/20 border-primary-fixed text-primary-fixed font-black"
                                        : "bg-white/5 border-white/10 text-zinc-400 hover:text-white hover:border-white/20"
                                    )}
                                  >
                                    <span className="font-bold text-white">{u.name || 'Sem Nome'}</span>
                                    {u.inviteCode && (
                                      <span className="text-[9px] bg-black/40 px-1.5 py-0.5 rounded text-zinc-400 font-mono">
                                        #{u.inviteCode}
                                      </span>
                                    )}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Raiz Ativa Informação */}
                        <div className="p-4 rounded-xl border border-primary-fixed/20 bg-primary-fixed/5 flex flex-col md:flex-row md:items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary-fixed text-black font-black flex items-center justify-center text-sm font-headline shrink-0">
                              {(activeTreeRootUser.name || 'S').charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-headline font-bold text-white text-sm">
                                  {activeTreeRootUser.name}
                                </h4>
                                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-white/10 text-primary-fixed">
                                  {activeTreeRootUser.tier || 'BRONZE'}
                                </span>
                              </div>
                              <p className="text-[11px] text-zinc-400 font-headline">
                                Tel: {activeTreeRootUser.phone || 'N/A'} • Código: {activeTreeRootUser.inviteCode || 'N/A'} • Saldo: R$ {activeTreeRootUser.creditsBalance || 0}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {selectedTreeUserUid && (
                              <button
                                type="button"
                                onClick={() => {
                                  setBonusModalUser({ uid: activeTreeRootUser.uid, name: activeTreeRootUser.name || 'Cliente' });
                                }}
                                className="px-3 py-1.5 bg-primary-fixed/20 hover:bg-primary-fixed/30 border border-primary-fixed/40 text-primary-fixed rounded-lg text-xs font-headline font-bold transition-all"
                              >
                                Conceder Bônus
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Componente Árvore Completo */}
                        <ReferralTree
                          rootNode={adminReferralTree}
                          isAdmin={true}
                          onSelectUserAsRoot={(uid) => setSelectedTreeUserUid(uid)}
                          onChangeReferrer={(uid, curr) => {
                            const found = users.find(u => u.uid === uid);
                            setReassignModalUser({
                              uid,
                              name: found?.name || 'Cliente',
                              currentReferrerUid: curr
                            });
                            setNewReferrerUid(curr || '');
                          }}
                          onGrantBonus={(uid, name) => {
                            setBonusModalUser({ uid, name });
                          }}
                        />
                      </div>
                    </ModuleErrorBoundary>
                  )}

                  {indicaSubTab === 'campaigns' && (
                    <ModuleErrorBoundary moduleName="Campanhas de Bônus">
                      <div className="space-y-6">
                        <div className="flex justify-between items-center"><h3 className="font-headline text-sm uppercase tracking-widest text-primary-fixed">Campanhas de Bônus da Rede</h3><button onClick={() => setEditingCampaign({ title: '', description: '', bonusLevel1Percent: 100, bonusLevel2Percent: 50, bonusLevel3Percent: 25, startDate: '', endDate: '' })} className="bg-white/5 border border-white/10 p-2 rounded-lg text-white hover:bg-white/10"><Plus className="w-5 h-5" /></button></div>
                        <div className="space-y-4">
                          {editingCampaign && (
                            <div className="glass-panel p-6 rounded-2xl border border-primary-fixed/30 space-y-4 animate-in zoom-in-95">
                              <input placeholder="Nome da Campanha" className="w-full bg-black/50 border border-white/10 rounded-xl p-4 font-headline uppercase tracking-widest text-xs" value={editingCampaign.title} onChange={e => setEditingCampaign({...editingCampaign, title: e.target.value})} />
                              <div className="grid grid-cols-3 gap-4">
                                <div><label className="text-[8px] uppercase text-zinc-500 font-headline mb-1 block">Nível 1 (R$)</label><input type="number" className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-xs" value={editingCampaign.bonusLevel1Percent} onChange={e => setEditingCampaign({...editingCampaign, bonusLevel1Percent: parseInt(e.target.value)})} /></div>
                                <div><label className="text-[8px] uppercase text-zinc-500 font-headline mb-1 block">Nível 2 (R$)</label><input type="number" className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-xs" value={editingCampaign.bonusLevel2Percent} onChange={e => setEditingCampaign({...editingCampaign, bonusLevel2Percent: parseInt(e.target.value)})} /></div>
                                <div><label className="text-[8px] uppercase text-zinc-500 font-headline mb-1 block">Nível 3 (R$)</label><input type="number" className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-xs" value={editingCampaign.bonusLevel3Percent} onChange={e => setEditingCampaign({...editingCampaign, bonusLevel3Percent: parseInt(e.target.value)})} /></div>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div><label className="text-[8px] uppercase text-zinc-500 font-headline mb-1 block">Data Início</label><input type="date" className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-xs" value={editingCampaign.startDate} onChange={e => setEditingCampaign({...editingCampaign, startDate: e.target.value})} /></div>
                                <div><label className="text-[8px] uppercase text-zinc-500 font-headline mb-1 block">Data Fim</label><input type="date" className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-xs" value={editingCampaign.endDate} onChange={e => setEditingCampaign({...editingCampaign, endDate: e.target.value})} /></div>
                              </div>
                              <div className="flex gap-4"><button onClick={() => setEditingCampaign(null)} className="flex-1 p-3 rounded-xl border border-white/10 text-zinc-500 font-headline uppercase text-[10px] tracking-widest">Cancelar</button><button onClick={() => handleUpdateCampaign(editingCampaign)} className="flex-1 p-3 rounded-xl bg-primary-fixed text-black font-headline font-black uppercase text-[10px] tracking-widest shadow-lg shadow-primary-fixed/20">Ativar Campanha</button></div>
                            </div>
                          )}
                          {campaigns.map(camp => (
                            <div key={camp.id} className="glass-panel p-6 rounded-2xl border border-white/5 flex justify-between items-center group">
                              <div className="space-y-1"><div className="flex items-center gap-2"><h4 className="font-headline text-sm text-white uppercase tracking-widest">{camp.title}</h4>{camp.active && <span className="text-[8px] bg-primary-fixed text-black px-1.5 rounded font-black uppercase">Ativa</span>}</div><p className="text-[10px] text-zinc-500 font-headline uppercase tracking-widest">Config: {camp.bonusLevel1Percent}/{camp.bonusLevel2Percent}/{camp.bonusLevel3Percent}</p></div>
                              <button onClick={() => toggleCampaign(camp)} className="text-zinc-600 hover:text-primary-fixed transition-colors">{camp.active ? <ToggleRight className="w-8 h-8 text-primary-fixed" /> : <ToggleLeft className="w-8 h-8" />}</button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </ModuleErrorBoundary>
                  )}

                  {indicaSubTab === 'invites' && (
                    <ModuleErrorBoundary moduleName="Convites VIP">
                      <div className="space-y-6">
                        <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-4">
                          <h3 className="font-headline text-sm uppercase tracking-widest text-primary-fixed">Novo Convite VIP Administrativo</h3>
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <input type="text" placeholder="CÓDIGO (ex: VIP2024)" className="bg-black/50 border border-white/10 rounded-xl p-4 text-sm font-headline uppercase" value={newInvite.code} onChange={e => setNewInvite({...newInvite, code: e.target.value.toUpperCase()})} />
                            <input type="number" placeholder="MAX USOS" className="bg-black/50 border border-white/10 rounded-xl p-4 text-sm font-headline" value={newInvite.maxUses} onChange={e => setNewInvite({...newInvite, maxUses: parseInt(e.target.value)})} />
                            <input type="number" placeholder="VALIDADE (DIAS)" className="bg-black/50 border border-white/10 rounded-xl p-4 text-sm font-headline" value={newInvite.expiresInDays} onChange={e => setNewInvite({...newInvite, expiresInDays: e.target.value})} />
                            <button onClick={handleCreateInvite} className="bg-primary-fixed text-black rounded-xl font-headline font-black uppercase tracking-widest text-[10px] h-full">Gerar Convite</button>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {invites.map(inv => (
                            <div key={inv.id} className="glass-panel p-5 rounded-2xl border border-white/5 flex justify-between items-center group">
                              <div className="space-y-1"><div className="flex items-center gap-2"><p className="font-headline text-lg text-white font-black">{inv.code}</p>{!inv.active && <span className="text-[8px] bg-red-400 text-black px-1.5 rounded font-black uppercase">Inativo</span>}</div><p className="text-[10px] text-zinc-500 font-headline uppercase tracking-widest">{inv.usesCount} / {inv.maxUses} usos</p></div>
                              <button onClick={() => toggleInvite(inv)} className="text-zinc-600 hover:text-primary-fixed transition-colors">{inv.active ? <ToggleRight className="w-8 h-8 text-primary-fixed" /> : <ToggleLeft className="w-8 h-8" />}</button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </ModuleErrorBoundary>
                  )}

                  {indicaSubTab === 'rules' && (
                    <ModuleErrorBoundary moduleName="Regras de Pontuação">
                      <div className="space-y-6">
                        <div className="flex justify-between items-center"><h3 className="font-headline text-sm uppercase tracking-widest text-primary-fixed">Regras de Pontuação e Membership</h3><button onClick={() => setEditingRule({ title: '', content: '', order: rules.length + 1 })} className="bg-white/5 border border-white/10 p-2 rounded-lg text-white hover:bg-white/10"><Plus className="w-5 h-5" /></button></div>
                        <div className="space-y-4">
                          {editingRule && (
                            <div className="glass-panel p-6 rounded-2xl border border-primary-fixed/30 space-y-4 animate-in zoom-in-95">
                              <input placeholder="Título da Regra" className="w-full bg-black/50 border border-white/10 rounded-xl p-4 font-headline uppercase tracking-widest text-xs" value={editingRule.title} onChange={e => setEditingRule({...editingRule, title: e.target.value})} />
                              <textarea placeholder="Conteúdo da política..." className="w-full bg-black/50 border border-white/10 rounded-xl p-4 text-sm min-h-[100px]" value={editingRule.content} onChange={e => setEditingRule({...editingRule, content: e.target.value})} />
                              <div className="flex gap-4"><button onClick={() => setEditingRule(null)} className="flex-1 p-3 rounded-xl border border-white/10 text-zinc-500 font-headline uppercase text-[10px] tracking-widest">Cancelar</button><button onClick={() => handleUpdateRule(editingRule)} className="flex-1 p-3 rounded-xl bg-primary-fixed text-black font-headline font-black uppercase text-[10px] tracking-widest">Salvar Regra</button></div>
                            </div>
                          )}
                          {rules.map(rule => (
                            <div key={rule.id} className="glass-panel p-6 rounded-2xl border border-white/5 group relative"><div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={() => setEditingRule(rule)} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg"><Edit2 className="w-4 h-4 text-zinc-400" /></button></div><div className="flex items-start gap-4"><span className="font-headline text-2xl text-zinc-800 font-black">{rule.order}</span><div className="space-y-1"><h4 className="font-headline text-sm text-white uppercase tracking-widest">{rule.title}</h4><p className="text-sm text-zinc-500 leading-relaxed">{rule.content}</p></div></div></div>
                          ))}
                        </div>
                      </div>
                    </ModuleErrorBoundary>
                  )}
                </div>
              )}

              {/* ==================== MÓDULO 3: TATTOO ENGINE PRO ==================== */}
              {currentModule === 'studio' && (
                <ModuleErrorBoundary moduleName="Tattoo Engine Pro">
                  <div className="w-full">
                    <TattooEngineModule />
                  </div>
                </ModuleErrorBoundary>
              )}

              {/* ==================== MÓDULO 4: GALERIA IA & SOCIAL ==================== */}
              {currentModule === 'galeria' && (
                <ModuleErrorBoundary moduleName="Galeria IA">
                  <div className="w-full">
                    <GaleriaIA embedded={true} initialTab={galeriaSubTab} />
                  </div>
                </ModuleErrorBoundary>
              )}

              {/* ==================== MÓDULO 5: SISTEMA & WHATSAPP ==================== */}
              {currentModule === 'system' && (
                <div className="space-y-6">
                  {systemSubTab === 'whatsapp' && (
                    <ModuleErrorBoundary moduleName="Automação WhatsApp">
                      <AdminSettings settings={settings} setSettings={setSettings} handleUpdateSettings={handleUpdateSettings} newBlock={newBlock} setNewBlock={setNewBlock} handleAddBlock={handleAddBlock} handleRemoveBlock={handleRemoveBlock} onTestWhatsApp={handleTestWhatsApp} />
                    </ModuleErrorBoundary>
                  )}

                  {systemSubTab === 'logs' && (
                    <ModuleErrorBoundary moduleName="Logs do Robô">
                      <div className="space-y-4">
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="font-headline text-sm uppercase tracking-widest text-primary-fixed">Histórico do Robô na Nuvem (Disparos 24/7)</h3>
                          <button onClick={() => fetchData(true)} className="text-[10px] text-zinc-500 uppercase font-headline hover:text-white">Atualizar Logs</button>
                        </div>
                        <div className="bg-black/40 border border-white/5 rounded-2xl overflow-hidden">
                          {automationLogs.length > 0 ? (
                            automationLogs.map((log) => (
                              <div key={log.id} className="p-4 border-b border-white/5 flex gap-3 items-start hover:bg-white/[0.02]">
                                <span className={cn(
                                  "w-2 h-2 rounded-full mt-1.5 shrink-0",
                                  log.type === 'error' ? 'bg-red-500' : log.type === 'warn' ? 'bg-yellow-500' : 'bg-green-500'
                                )} />
                                <div>
                                  <p className={cn("text-xs font-headline leading-tight", log.type === 'error' ? 'text-red-400' : 'text-zinc-300')}>
                                    {log.message}
                                  </p>
                                  <p className="text-[8px] text-zinc-600 mt-1 uppercase font-headline">
                                     {log.timestamp?.toDate ? format(log.timestamp.toDate(), 'HH:mm:ss - dd/MM') : 'Agora'}
                                  </p>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="p-10 text-center text-zinc-700 text-xs uppercase font-headline tracking-widest italic">Nenhum log registrado ainda.</div>
                          )}
                        </div>
                      </div>
                    </ModuleErrorBoundary>
                  )}
                </div>
              )}

            </div>
          )}

          {/* RESCHEDULE MODAL */}
          {selectedBooking && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center px-6">
              <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setSelectedBooking(null)}></div>
              <div className="bg-zinc-900 border border-white/10 p-6 rounded-2xl w-full max-w-sm relative z-10">
                <h3 className="font-headline text-lg text-white mb-4 uppercase">Reagendar Tattoo</h3>
                <div className="space-y-4">
                  <div><label className="text-[10px] uppercase font-headline text-zinc-500 block mb-1">Nova Data</label><input type="date" onChange={(e) => setRescheduleData({...rescheduleData, date: e.target.value})} className="w-full bg-black border border-white/10 rounded-lg h-12 px-4 text-white" /></div>
                  <div><label className="text-[10px] uppercase font-headline text-zinc-500 block mb-1">Novo Horário</label><input type="time" onChange={(e) => setRescheduleData({...rescheduleData, time: e.target.value})} className="w-full bg-black border border-white/10 rounded-lg h-12 px-4 text-white" /></div>
                  <div className="flex gap-2 pt-2"><button onClick={() => setSelectedBooking(null)} className="flex-1 py-3 bg-zinc-800 text-white rounded-lg font-headline text-[10px] uppercase">Cancelar</button><button onClick={() => handleStatusChange(selectedBooking, BookingStatus.RESCHEDULED, rescheduleData)} className="flex-1 py-3 bg-primary-fixed text-black rounded-lg font-headline text-[10px] uppercase font-black">Confirmar</button></div>
                </div>
              </div>
            </div>
          )}

          {/* ADJUST CREDITS MODAL */}
          {selectedUser && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center px-6">
              <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setSelectedUser(null)}></div>
              <div className="bg-zinc-900 border border-white/10 p-6 rounded-2xl w-full max-w-sm relative z-10 shadow-2xl">
                <h3 className="font-headline text-lg text-white mb-4 uppercase">Ajustar Créditos: {selectedUser.name}</h3>
                <div className="space-y-4">
                  <div><label className="text-[10px] uppercase font-headline text-zinc-500 block mb-1">Valor</label><input type="number" value={adjustAmount} onChange={(e) => setAdjustAmount(e.target.value)} placeholder="Ex: 50 ou -50" className="w-full bg-black border border-white/10 rounded-lg h-12 px-4 text-white font-headline" /></div>
                  <div><label className="text-[10px] uppercase font-headline text-zinc-500 block mb-1">Motivo</label><textarea value={adjustDesc} onChange={(e) => setAdjustDesc(e.target.value)} placeholder="Motivo..." className="w-full bg-black border border-white/10 rounded-lg p-4 text-white text-sm h-24" /></div>
                  <div className="flex gap-3 pt-2"><button onClick={() => setSelectedUser(null)} className="flex-1 h-12 rounded-lg bg-zinc-800 text-white font-headline text-xs uppercase">Cancelar</button><button onClick={handleAdjustCredits} disabled={adjusting || !adjustAmount || !adjustDesc} className="flex-1 h-12 rounded-lg bg-primary-fixed text-black font-headline text-xs uppercase font-black disabled:opacity-50">{adjusting ? "Salvando..." : "Confirmar"}</button></div>
                </div>
              </div>
            </div>
          )}

          {/* REASSIGN REFERRER MODAL */}
          {reassignModalUser && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center px-6">
              <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setReassignModalUser(null)}></div>
              <div className="bg-zinc-900 border border-white/10 p-6 rounded-2xl w-full max-w-md relative z-10 shadow-2xl space-y-4">
                <div className="border-b border-white/5 pb-3">
                  <h3 className="font-headline text-base text-white font-bold uppercase">
                    Reatribuir Indicador na Rede
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    Alterar a quem <strong className="text-primary-fixed">{reassignModalUser.name}</strong> está subordinado na hierarquia.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] uppercase font-headline text-zinc-500 block mb-1">
                      Novo Indicador (Pai direto na pirâmide):
                    </label>
                    <select
                      value={newReferrerUid}
                      onChange={(e) => setNewReferrerUid(e.target.value)}
                      className="w-full bg-black border border-white/10 rounded-xl h-12 px-4 text-white text-xs font-headline focus:border-primary-fixed/50 outline-none"
                    >
                      <option value="">Nenhum (Topo da rede / Direto do Estúdio)</option>
                      {users
                        .filter(u => u.uid !== reassignModalUser.uid)
                        .map(u => (
                          <option key={u.uid} value={u.uid}>
                            {u.name || 'Sem nome'} ({u.phone || 'Sem tel'} - #{u.inviteCode || 'SEM COD'})
                          </option>
                        ))
                      }
                    </select>
                  </div>

                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs leading-relaxed">
                    ⚠️ Ao alterar o indicador, todas as comissões futuras geradas por este membro subirão pela nova linha de patrocinadores.
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setReassignModalUser(null)}
                      className="flex-1 h-12 rounded-xl bg-zinc-800 text-white font-headline text-xs uppercase hover:bg-zinc-700 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveReassign}
                      disabled={savingReassign}
                      className="flex-1 h-12 rounded-xl bg-primary-fixed text-black font-headline text-xs uppercase font-black disabled:opacity-50 hover:bg-primary-fixed/90 transition-colors shadow-lg shadow-primary-fixed/20"
                    >
                      {savingReassign ? "Salvando..." : "Salvar Mudança"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* BONUS CREDITS MODAL */}
          {bonusModalUser && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center px-6">
              <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setBonusModalUser(null)}></div>
              <div className="bg-zinc-900 border border-white/10 p-6 rounded-2xl w-full max-w-sm relative z-10 shadow-2xl space-y-4">
                <div className="border-b border-white/5 pb-3">
                  <h3 className="font-headline text-base text-white font-bold uppercase">
                    Conceder Bônus de Rede
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    Creditando membro: <strong className="text-primary-fixed">{bonusModalUser.name}</strong>
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] uppercase font-headline text-zinc-500 block mb-1">
                      Valor do Bônus em Créditos (R$)
                    </label>
                    <input
                      type="number"
                      value={bonusAmount}
                      onChange={(e) => setBonusAmount(e.target.value)}
                      placeholder="Ex: 50 ou 100"
                      className="w-full bg-black border border-white/10 rounded-xl h-12 px-4 text-white font-headline text-sm focus:border-primary-fixed/50 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-headline text-zinc-500 block mb-1">
                      Motivo / Descrição
                    </label>
                    <input
                      type="text"
                      value={bonusReason}
                      onChange={(e) => setBonusReason(e.target.value)}
                      placeholder="Ex: Bônus de Liderança de Equipe / Destaque do Mês"
                      className="w-full bg-black border border-white/10 rounded-xl h-12 px-4 text-white text-xs focus:border-primary-fixed/50 outline-none"
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setBonusModalUser(null)}
                      className="flex-1 h-12 rounded-xl bg-zinc-800 text-white font-headline text-xs uppercase hover:bg-zinc-700 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveTreeBonus}
                      disabled={savingBonus || !bonusAmount}
                      className="flex-1 h-12 rounded-xl bg-primary-fixed text-black font-headline text-xs uppercase font-black disabled:opacity-50 hover:bg-primary-fixed/90 transition-colors shadow-lg shadow-primary-fixed/20"
                    >
                      {savingBonus ? "Creditando..." : "Conceder Bônus"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0d0d12]/95 backdrop-blur-xl border-t border-white/10 px-2 py-2 flex items-center justify-around">
        <button
          type="button"
          onClick={() => { setCurrentModule('agenda'); setAgendaSubTab('calendar'); }}
          className={cn(
            "flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-all",
            currentModule === 'agenda' ? "text-primary-fixed font-black" : "text-zinc-500 hover:text-zinc-300"
          )}
        >
          <Calendar className="w-4 h-4" />
          <span className="text-[8px] font-headline uppercase">Agenda</span>
        </button>

        <button
          type="button"
          onClick={() => { setCurrentModule('indicaai'); setIndicaSubTab('dashboard'); }}
          className={cn(
            "flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-all",
            currentModule === 'indicaai' ? "text-primary-fixed font-black" : "text-zinc-500 hover:text-zinc-300"
          )}
        >
          <BarChart3 className="w-4 h-4" />
          <span className="text-[8px] font-headline uppercase">IndicaAi</span>
        </button>

        <button
          type="button"
          onClick={() => setCurrentModule('studio')}
          className={cn(
            "flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-all",
            currentModule === 'studio' ? "text-amber-400 font-black" : "text-zinc-500 hover:text-zinc-300"
          )}
        >
          <Sparkles className="w-4 h-4" />
          <span className="text-[8px] font-headline uppercase">Tattoo IA</span>
        </button>

        <button
          type="button"
          onClick={() => setCurrentModule('galeria')}
          className={cn(
            "flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-all",
            currentModule === 'galeria' ? "text-pink-400 font-black" : "text-zinc-500 hover:text-zinc-300"
          )}
        >
          <Camera className="w-4 h-4" />
          <span className="text-[8px] font-headline uppercase">Galeria IA</span>
        </button>

        <button
          type="button"
          onClick={() => setIsMobileDrawerOpen(true)}
          className="flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl text-zinc-500 hover:text-zinc-300"
        >
          <Menu className="w-4 h-4" />
          <span className="text-[8px] font-headline uppercase">Menu</span>
        </button>
      </div>

    </div>
  );
}
