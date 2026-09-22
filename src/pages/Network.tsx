import React, { useState, useEffect, useMemo } from 'react';
import { 
  Share2, Copy, Info, Users, Sparkles, CheckCircle2, 
  Calendar, UserPlus, GitFork, ListFilter
} from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserProfile, Booking, UserTier, UserRole, BookingStatus } from '../types';
import ReferralTree from '../components/network/ReferralTree';
import { buildReferralTree, calculateTreeStats, flattenTreeByLevels } from '../lib/referralUtils';

export default function Network() {
  const { profile } = useAuth();
  const [viewMode, setViewMode] = useState<'tree' | 'list'>('tree');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  // Carregar dados reais do Firestore
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const usersSnap = await getDocs(collection(db, 'users'));
        const loadedUsers = usersSnap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile));

        const bookingsSnap = await getDocs(collection(db, 'bookings'));
        const loadedBookings = bookingsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Booking));

        setUsers(loadedUsers);
        setBookings(loadedBookings);
      } catch (err) {
        console.error("Erro ao carregar dados da rede:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Perfil efetivo (real ou fallback mockado)
  const currentProfile: UserProfile = useMemo(() => {
    return profile || {
      uid: 'user_me',
      name: 'Você (Membro VIP)',
      phone: '11999999999',
      role: UserRole.USER,
      tier: UserTier.OURO,
      inviteCode: 'VIP-TATTOO',
      creditsBalance: 420,
      createdAt: new Date()
    };
  }, [profile]);

  // Se a base de dados tiver poucos ou nenhum indicado para o usuário, preenche com amostra demonstrativa
  const effectiveUsers: UserProfile[] = useMemo(() => {
    const directChildren = users.filter(u => u.referredBy === currentProfile.uid);
    if (directChildren.length > 0) {
      return users;
    }

    // Amostra rica e realista de 3 níveis para demonstração interativa imediata
    const sampleData: UserProfile[] = [
      ...users,
      // Nível 1 (Diretos de você)
      {
        uid: 'user_n1_1',
        name: 'Ricardo Mendes',
        phone: '11988881111',
        role: UserRole.USER,
        tier: UserTier.OURO,
        inviteCode: 'RICARDO10',
        referredBy: currentProfile.uid,
        creditsBalance: 150,
        createdAt: new Date()
      },
      {
        uid: 'user_n1_2',
        name: 'Carla Dias',
        phone: '11977772222',
        role: UserRole.USER,
        tier: UserTier.PRATA,
        inviteCode: 'CARLA-VIP',
        referredBy: currentProfile.uid,
        creditsBalance: 80,
        createdAt: new Date()
      },
      // Nível 2 (Filhos do Ricardo e da Carla)
      {
        uid: 'user_n2_1',
        name: 'Marcos Vinicius',
        phone: '11966663333',
        role: UserRole.USER,
        tier: UserTier.BRONZE,
        inviteCode: 'MV-INK',
        referredBy: 'user_n1_1',
        creditsBalance: 40,
        createdAt: new Date()
      },
      {
        uid: 'user_n2_2',
        name: 'Juliana Costa',
        phone: '11955554444',
        role: UserRole.USER,
        tier: UserTier.BRONZE,
        inviteCode: 'JU-TATTOO',
        referredBy: 'user_n1_2',
        creditsBalance: 30,
        createdAt: new Date()
      },
      // Nível 3 (Filho do Marcos)
      {
        uid: 'user_n3_1',
        name: 'Felipe Alcantara',
        phone: '11944445555',
        role: UserRole.USER,
        tier: UserTier.BRONZE,
        inviteCode: 'FELIPE-NEW',
        referredBy: 'user_n2_1',
        creditsBalance: 0,
        createdAt: new Date()
      }
    ];

    return sampleData;
  }, [users, currentProfile]);

  const effectiveBookings: Booking[] = useMemo(() => {
    if (bookings.length > 0) return bookings;
    return [
      { id: 'b1', userId: 'user_n1_1', clientName: 'Ricardo Mendes', date: '2026-03-20', time: '14:00', duration: 120, status: BookingStatus.COMPLETED, tattooName: 'Fechamento Oriental', price: 1500, depositPaid: 200, category: 'Realismo' },
      { id: 'b2', userId: 'user_n1_2', clientName: 'Carla Dias', date: '2026-03-24', time: '16:00', duration: 90, status: BookingStatus.APPROVED, tattooName: 'Floral Fine Line', price: 800, depositPaid: 100, category: 'Fine Line' },
      { id: 'b3', userId: 'user_n2_1', clientName: 'Marcos Vinicius', date: '2026-03-18', time: '10:00', duration: 180, status: BookingStatus.COMPLETED, tattooName: 'Leão Blackwork', price: 1200, depositPaid: 150, category: 'Blackwork' }
    ] as Booking[];
  }, [bookings]);

  // Montar árvore
  const rootNode = useMemo(() => {
    return buildReferralTree(currentProfile, effectiveUsers, effectiveBookings, 3);
  }, [currentProfile, effectiveUsers, effectiveBookings]);

  const stats = useMemo(() => calculateTreeStats(rootNode), [rootNode]);
  const levelsData = useMemo(() => flattenTreeByLevels(rootNode), [rootNode]);

  const handleCopy = () => {
    if (currentProfile?.inviteCode) {
      navigator.clipboard.writeText(currentProfile.inviteCode);
      alert('Código copiado!');
    }
  };

  const handleShareWhatsApp = () => {
    const code = currentProfile?.inviteCode || '';
    const text = encodeURIComponent(`💉 Entrei no Clube VIP Somos 1 Tattoo Studio! Use meu código VIP: *${code}* ou acesse pelo link para ganhar desconto e créditos na sua tattoo! 🔥`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  return (
    <div className="bg-[#0a0a0f] text-on-surface font-sans min-h-screen pb-32">
      {/* ── HEADER SUPERIOR ── */}
      <header className="bg-zinc-950/80 backdrop-blur-xl border-b border-white/10 sticky top-0 z-50 flex items-center justify-between px-6 h-16 w-full">
        <div className="flex items-center gap-2">
          <GitFork className="w-5 h-5 text-primary-fixed" />
          <h1 className="font-headline text-xl font-black tracking-tight text-white uppercase">
            Rede & <span className="text-primary-fixed">Indicações</span>
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-[10px] uppercase font-headline text-zinc-400">Seus Créditos</p>
            <p className="text-xs font-headline font-black text-primary-fixed">R$ {currentProfile.creditsBalance}</p>
          </div>
          <div className="w-9 h-9 rounded-xl border border-primary-fixed/30 overflow-hidden bg-zinc-800 flex items-center justify-center">
            {currentProfile?.avatar ? (
              <img alt="Profile" className="w-full h-full object-cover" src={currentProfile.avatar} />
            ) : (
              <span className="text-primary-fixed font-headline font-bold">{currentProfile?.name?.[0]}</span>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-6">
        
        {/* ── SEÇÃO SUPERIOR: CONVITE & REGRAS ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          
          {/* Card de Compartilhamento */}
          <motion.div 
            initial={{ scale: 0.98, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="lg:col-span-2 glass-panel p-6 rounded-3xl border border-primary-fixed/20 bg-gradient-to-br from-[#121218] via-[#0d0d12] to-black relative overflow-hidden"
          >
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="font-headline text-[10px] text-primary-fixed uppercase tracking-widest font-black">
                  Seu Código de Indicação VIP
                </span>
                <span className="text-[10px] bg-primary-fixed/10 text-primary-fixed px-2 py-0.5 rounded-full font-bold">
                  Ativo & Ilimitado
                </span>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="bg-black/60 border border-white/10 rounded-2xl p-4 flex-1 flex items-center justify-between w-full">
                  <span className="font-headline text-2xl font-black text-white tracking-widest">
                    {currentProfile.inviteCode}
                  </span>
                  <button onClick={handleCopy} className="p-2 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white transition-colors">
                    <Copy className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex gap-2 w-full sm:w-auto">
                  <button 
                    onClick={handleCopy}
                    className="flex-1 sm:flex-none px-6 py-4 rounded-2xl bg-primary-fixed text-black font-headline font-black text-xs uppercase tracking-wider hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-primary-fixed/20 flex items-center justify-center gap-2"
                  >
                    <Copy className="w-4 h-4" />
                    Copiar
                  </button>
                  <button 
                    onClick={handleShareWhatsApp}
                    className="flex-1 sm:flex-none px-6 py-4 rounded-2xl bg-green-600/20 text-green-400 border border-green-600/30 font-headline font-black text-xs uppercase tracking-wider hover:bg-green-600/30 active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    <Share2 className="w-4 h-4" />
                    WhatsApp
                  </button>
                </div>
              </div>

              <p className="text-xs text-zinc-400">
                Compartilhe com seus amigos. Quando eles tatuam, você ganha créditos em até 3 níveis da sua rede!
              </p>
            </div>
          </motion.div>

          {/* Card Explicativo dos 3 Níveis */}
          <div className="glass-panel p-5 rounded-3xl border border-white/10 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2 text-white">
                <Info className="w-4 h-4 text-primary-fixed" />
                <h4 className="font-headline text-xs font-black uppercase tracking-wider">Como Funciona a Pirâmide</h4>
              </div>
              <ul className="text-xs space-y-2 mt-3 font-headline">
                <li className="flex items-center justify-between text-[#c3f400] bg-[#c3f400]/5 p-2 rounded-xl border border-[#c3f400]/20">
                  <span>Nível 1 (Diretos)</span>
                  <span className="font-black">10% de Volta</span>
                </li>
                <li className="flex items-center justify-between text-purple-300 bg-purple-500/5 p-2 rounded-xl border border-purple-500/20">
                  <span>Nível 2 (Amigos)</span>
                  <span className="font-black">5% de Volta</span>
                </li>
                <li className="flex items-center justify-between text-cyan-300 bg-cyan-500/5 p-2 rounded-xl border border-cyan-500/20">
                  <span>Nível 3 (3ª Geração)</span>
                  <span className="font-black">2.5% de Volta</span>
                </li>
              </ul>
            </div>

            <p className="text-[10px] text-zinc-500 italic mt-3">
              Créditos são liberados na conclusão do atendimento no estúdio.
            </p>
          </div>
        </div>

        {/* ── BARRA DE SELEÇÃO: ÁRVORE VISUAL VS LISTA DETALHADA ── */}
        <div className="flex items-center justify-between pt-4 border-t border-white/10">
          <div>
            <h2 className="text-lg font-headline font-black uppercase text-white flex items-center gap-2">
              <span>Sua Rede Multinível</span>
              <span className="text-xs text-zinc-500 font-normal">({stats.totalPeople} pessoas)</span>
            </h2>
          </div>

          <div className="flex bg-zinc-900/80 p-1 rounded-2xl border border-white/10">
            <button
              onClick={() => setViewMode('tree')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-headline font-bold transition-all ${
                viewMode === 'tree' ? 'bg-primary-fixed text-black shadow-md font-black' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <GitFork className="w-3.5 h-3.5" />
              <span>Pirâmide Visual</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-headline font-bold transition-all ${
                viewMode === 'list' ? 'bg-primary-fixed text-black shadow-md font-black' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <ListFilter className="w-3.5 h-3.5" />
              <span>Lista por Níveis</span>
            </button>
          </div>
        </div>

        {/* ── MODO 1: PIRÂMIDE VISUAL ── */}
        {viewMode === 'tree' && (
          <div className="glass-panel p-4 md:p-6 rounded-3xl border border-white/10 bg-[#0d0d12]/60">
            <ReferralTree rootNode={rootNode} />
          </div>
        )}

        {/* ── MODO 2: LISTA DETALHADA POR NÍVEIS ── */}
        {viewMode === 'list' && (
          <div className="space-y-6">
            {/* Nível 1 */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-headline font-black px-2.5 py-0.5 rounded-full bg-[#c3f400]/20 text-[#c3f400] border border-[#c3f400]/30 uppercase">
                  Nível 1 • Indicações Diretas ({levelsData[1]?.length || 0})
                </span>
                <div className="h-px flex-1 bg-white/10" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {levelsData[1]?.map(item => (
                  <div key={item.user.uid} className="glass-panel p-4 rounded-2xl border border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center font-headline font-black text-white">
                        {item.user.name?.charAt(0) || 'U'}
                      </div>
                      <div>
                        <p className="font-headline font-bold text-sm text-white">{item.user.name}</p>
                        <p className="text-[10px] text-zinc-500 font-headline">{item.totalTattoos} tattoo(s) concluída(s)</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-headline font-black text-primary-fixed">+ R$ {item.creditsGenerated}</span>
                      <p className="text-[8px] text-zinc-500 uppercase font-headline">Gerado</p>
                    </div>
                  </div>
                ))}
                {(!levelsData[1] || levelsData[1].length === 0) && (
                  <div className="p-8 text-center text-xs text-zinc-600 uppercase font-headline border border-dashed border-white/10 rounded-2xl col-span-2">
                    Nenhum amigo no Nível 1
                  </div>
                )}
              </div>
            </div>

            {/* Nível 2 */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-headline font-black px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 uppercase">
                  Nível 2 • Amigos dos Seus Amigos ({levelsData[2]?.length || 0})
                </span>
                <div className="h-px flex-1 bg-white/10" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {levelsData[2]?.map(item => (
                  <div key={item.user.uid} className="glass-panel p-4 rounded-2xl border border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center font-headline font-black text-white">
                        {item.user.name?.charAt(0) || 'U'}
                      </div>
                      <div>
                        <p className="font-headline font-bold text-sm text-white">{item.user.name}</p>
                        <p className="text-[10px] text-zinc-500 font-headline">{item.totalTattoos} tattoo(s)</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-headline font-black text-purple-300">+ R$ {item.creditsGenerated}</span>
                      <p className="text-[8px] text-zinc-500 uppercase font-headline">Gerado</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Nível 3 */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-headline font-black px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 uppercase">
                  Nível 3 • Terceira Geração ({levelsData[3]?.length || 0})
                </span>
                <div className="h-px flex-1 bg-white/10" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {levelsData[3]?.map(item => (
                  <div key={item.user.uid} className="glass-panel p-4 rounded-2xl border border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center font-headline font-black text-white">
                        {item.user.name?.charAt(0) || 'U'}
                      </div>
                      <div>
                        <p className="font-headline font-bold text-sm text-white">{item.user.name}</p>
                        <p className="text-[10px] text-zinc-500 font-headline">{item.totalTattoos} tattoo(s)</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-headline font-black text-cyan-300">+ R$ {item.creditsGenerated}</span>
                      <p className="text-[8px] text-zinc-500 uppercase font-headline">Gerado</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
