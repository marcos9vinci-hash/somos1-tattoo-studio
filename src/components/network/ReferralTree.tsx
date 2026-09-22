import React, { useState } from 'react';
import { 
  Users, ChevronDown, ChevronRight, Sparkles, CheckCircle2, 
  Calendar, Clock, Phone, MessageSquare, ShieldAlert, Award,
  ArrowRight, UserCheck, Edit3, DollarSign, X, ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ReferralNode, TreeStats, calculateTreeStats } from '../../lib/referralUtils';
import { UserTier } from '../../types';

interface ReferralTreeProps {
  rootNode: ReferralNode;
  isAdmin?: boolean;
  onSelectUserAsRoot?: (uid: string) => void;
  onChangeReferrer?: (userUid: string, currentReferrerUid?: string) => void;
  onGrantBonus?: (userUid: string, userName: string) => void;
}

export default function ReferralTree({
  rootNode,
  isAdmin = false,
  onSelectUserAsRoot,
  onChangeReferrer,
  onGrantBonus
}: ReferralTreeProps) {
  const [selectedNode, setSelectedNode] = useState<ReferralNode | null>(null);
  const [collapsedNodes, setCollapsedNodes] = useState<Record<string, boolean>>({});

  const stats: TreeStats = calculateTreeStats(rootNode);

  const toggleCollapse = (uid: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsedNodes(prev => ({ ...prev, [uid]: !prev[uid] }));
  };

  const getTierColor = (tier?: UserTier) => {
    switch (tier) {
      case UserTier.DIAMANTE: return 'from-cyan-400 to-blue-500 border-cyan-400/50 text-cyan-300';
      case UserTier.OURO: return 'from-yellow-400 to-amber-500 border-yellow-400/50 text-yellow-300';
      case UserTier.PRATA: return 'from-zinc-200 to-zinc-400 border-zinc-300/50 text-zinc-200';
      default: return 'from-amber-700 to-yellow-800 border-amber-600/40 text-amber-400';
    }
  };

  const getLevelBadge = (level: number) => {
    switch (level) {
      case 0:
        return { label: 'PATROCINADOR (RAIZ)', color: 'bg-primary-fixed/20 text-primary-fixed border-primary-fixed/30' };
      case 1:
        return { label: 'NÍVEL 1 • DIRETO (10%)', color: 'bg-[#c3f400]/15 text-[#c3f400] border-[#c3f400]/30' };
      case 2:
        return { label: 'NÍVEL 2 • AMIGO DE AMIGO (5%)', color: 'bg-purple-500/15 text-purple-300 border-purple-500/30' };
      case 3:
        return { label: 'NÍVEL 3 • 3ª GERAÇÃO (2.5%)', color: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30' };
      default:
        return { label: `NÍVEL ${level}`, color: 'bg-zinc-800 text-zinc-400 border-zinc-700' };
    }
  };

  return (
    <div className="w-full space-y-8 select-none">
      {/* ── BARRA DE RESUMO E MÉTRICAS DA PIRÂMIDE ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="glass-panel p-4 rounded-2xl border border-white/5 bg-black/40">
          <p className="text-[10px] uppercase font-headline tracking-widest text-zinc-400">Total na Rede</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-headline font-black text-white">{stats.totalPeople}</span>
            <span className="text-[10px] text-zinc-500 font-headline">pessoas</span>
          </div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-[#c3f400]/20 bg-[#c3f400]/[0.02]">
          <p className="text-[10px] uppercase font-headline tracking-widest text-[#c3f400]">Nível 1 (Diretos)</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-headline font-black text-[#c3f400]">{stats.level1Count}</span>
            <span className="text-[10px] text-zinc-500 font-headline">amigos</span>
          </div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-purple-500/20 bg-purple-500/[0.02]">
          <p className="text-[10px] uppercase font-headline tracking-widest text-purple-300">Nível 2 & 3</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-headline font-black text-purple-300">{stats.level2Count + stats.level3Count}</span>
            <span className="text-[10px] text-zinc-500 font-headline">indiretos</span>
          </div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.02]">
          <p className="text-[10px] uppercase font-headline tracking-widest text-emerald-400">Tattoos Feitas</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-headline font-black text-emerald-400">{stats.completedTattoos}</span>
            <span className="text-[10px] text-zinc-500 font-headline">obras</span>
          </div>
        </div>
      </div>

      {/* ── CONTAINER DA ÁRVORE VISUAL ── */}
      <div className="w-full overflow-x-auto pb-8 pt-2 no-scrollbar">
        <div className="min-w-[700px] flex flex-col items-center">
          
          {/* NÓ RAIZ (TOPO DA PIRÂMIDE) */}
          <div className="flex flex-col items-center relative z-10">
            <div 
              onClick={() => setSelectedNode(rootNode)}
              className="cursor-pointer group relative flex flex-col items-center p-4 rounded-3xl bg-gradient-to-b from-[#181820] to-[#0d0d12] border-2 border-primary-fixed shadow-[0_0_30px_-5px_rgba(195,244,0,0.3)] transition-all hover:scale-105"
            >
              <span className="absolute -top-3 px-3 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-primary-fixed text-black shadow-md">
                👑 Raiz da Rede
              </span>

              <div className="flex items-center gap-3 mt-1">
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${getTierColor(rootNode.user.tier)} p-0.5 flex items-center justify-center shadow-md`}>
                  <div className="w-full h-full bg-[#111116] rounded-2xl flex items-center justify-center font-headline font-black text-lg text-white">
                    {rootNode.user.avatar ? (
                      <img src={rootNode.user.avatar} alt="" className="w-full h-full object-cover rounded-2xl" />
                    ) : (
                      rootNode.user.name?.charAt(0)?.toUpperCase() || 'R'
                    )}
                  </div>
                </div>

                <div className="text-left">
                  <h4 className="font-headline font-black text-sm text-white flex items-center gap-1.5">
                    {rootNode.user.name || 'Cliente Patrocinador'}
                  </h4>
                  <p className="text-[10px] text-zinc-400 font-headline uppercase tracking-wider">
                    {rootNode.user.inviteCode ? `CÓDIGO: ${rootNode.user.inviteCode}` : rootNode.user.phone}
                  </p>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-white/10 w-full flex items-center justify-between text-[10px] text-zinc-400 gap-4">
                <span>Saldo: <b className="text-primary-fixed">R$ {rootNode.user.creditsBalance}</b></span>
                <span>{rootNode.children.length} Diretos</span>
              </div>
            </div>

            {/* Linha vertical descendo do Root */}
            {rootNode.children.length > 0 && (
              <div className="w-0.5 h-10 bg-gradient-to-b from-primary-fixed to-primary-fixed/30 my-0" />
            )}
          </div>

          {/* ── NÍVEL 1 (DIRETOS) ── */}
          {rootNode.children.length > 0 ? (
            <div className="w-full flex flex-col items-center relative">
              {/* Barra horizontal conectoras do Nível 1 */}
              {rootNode.children.length > 1 && (
                <div className="w-[85%] h-0.5 bg-white/15 absolute top-0" />
              )}

              <div className="flex justify-center gap-6 md:gap-10 pt-6 flex-wrap w-full">
                {rootNode.children.map((n1Node) => (
                  <TreeNodeItem 
                    key={n1Node.user.uid}
                    node={n1Node}
                    isCollapsed={collapsedNodes[n1Node.user.uid]}
                    onToggleCollapse={toggleCollapse}
                    onSelectNode={setSelectedNode}
                    getTierColor={getTierColor}
                    getLevelBadge={getLevelBadge}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-6 p-8 rounded-2xl border border-dashed border-white/10 text-center max-w-sm">
              <Users className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
              <p className="text-xs text-zinc-400 font-headline font-bold uppercase">Nenhum indicado direto ainda</p>
              <p className="text-[10px] text-zinc-600 mt-1">Compartilhe o link de convite para começar a formar sua pirâmide de créditos.</p>
            </div>
          )}

        </div>
      </div>

      {/* ── MODAL DE DETALHES DO NÓ / AÇÕES ADMINISTRATIVAS ── */}
      <AnimatePresence>
        {selectedNode && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedNode(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="w-full max-w-md bg-[#111116] border border-white/15 rounded-3xl p-6 relative z-10 shadow-2xl space-y-5"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${getTierColor(selectedNode.user.tier)} p-0.5`}>
                    <div className="w-full h-full bg-[#181820] rounded-2xl flex items-center justify-center font-headline font-black text-xl text-white">
                      {selectedNode.user.name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                  </div>
                  <div>
                    <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full border ${getLevelBadge(selectedNode.level).color}`}>
                      {getLevelBadge(selectedNode.level).label}
                    </span>
                    <h3 className="font-headline font-black text-lg text-white mt-1">
                      {selectedNode.user.name || 'Sem Nome'}
                    </h3>
                    <p className="text-xs text-zinc-400 font-headline">
                      {selectedNode.user.phone || 'Sem telefone'}
                    </p>
                  </div>
                </div>

                <button 
                  onClick={() => setSelectedNode(null)}
                  className="p-2 text-zinc-500 hover:text-white rounded-full hover:bg-white/5 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Status do Membro */}
              <div className="grid grid-cols-2 gap-3 bg-black/40 p-4 rounded-2xl border border-white/5 text-center">
                <div>
                  <p className="text-[9px] uppercase font-headline tracking-widest text-zinc-500">Tatuagens Feitas</p>
                  <p className="text-xl font-headline font-black text-white mt-0.5">
                    {selectedNode.totalTattoos}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] uppercase font-headline tracking-widest text-zinc-500">Créditos Gerados</p>
                  <p className="text-xl font-headline font-black text-primary-fixed mt-0.5">
                    R$ {selectedNode.creditsGenerated}
                  </p>
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="space-y-2 pt-2">
                {selectedNode.user.phone && (
                  <button
                    onClick={() => {
                      const ph = selectedNode.user.phone.replace(/\D/g, '');
                      const fullPhone = ph.startsWith('55') ? ph : `55${ph}`;
                      window.open(`https://wa.me/${fullPhone}?text=Olá ${selectedNode.user.name || ''}, passando para agradecer por fazer parte do Clube VIP Somos 1 Tattoo!`, '_blank');
                    }}
                    className="w-full py-3 bg-green-600/20 text-green-400 border border-green-600/30 rounded-xl font-headline text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-green-600/30 transition-all"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Conversar no WhatsApp
                  </button>
                )}

                {/* AÇÕES DE ADMINISTRADOR */}
                {isAdmin && (
                  <div className="pt-3 border-t border-white/10 space-y-2">
                    <p className="text-[9px] font-headline font-black uppercase tracking-widest text-primary-fixed">
                      Controles Administrativos
                    </p>

                    <div className="grid grid-cols-2 gap-2">
                      {onSelectUserAsRoot && (
                        <button
                          onClick={() => {
                            onSelectUserAsRoot(selectedNode.user.uid);
                            setSelectedNode(null);
                          }}
                          className="py-2.5 px-3 bg-white/5 border border-white/10 rounded-xl text-[10px] font-headline font-bold text-white hover:bg-white/10 flex items-center justify-center gap-1.5"
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-primary-fixed" />
                          Ver como Raiz
                        </button>
                      )}

                      {onChangeReferrer && (
                        <button
                          onClick={() => {
                            onChangeReferrer(selectedNode.user.uid, selectedNode.user.referredBy);
                            setSelectedNode(null);
                          }}
                          className="py-2.5 px-3 bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded-xl text-[10px] font-headline font-bold hover:bg-blue-500/20 flex items-center justify-center gap-1.5"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          Trocar Indicador
                        </button>
                      )}
                    </div>

                    {onGrantBonus && (
                      <button
                        onClick={() => {
                          onGrantBonus(selectedNode.user.uid, selectedNode.user.name || 'Cliente');
                          setSelectedNode(null);
                        }}
                        className="w-full py-2.5 bg-primary-fixed text-black rounded-xl text-[10px] font-headline font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md shadow-primary-fixed/20 hover:opacity-90"
                      >
                        <DollarSign className="w-3.5 h-3.5" />
                        Bonificar este Cliente
                      </button>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Componente Recursivo de Item da Árvore (Nível 1, Nível 2 e Nível 3)
 */
function TreeNodeItem({
  node,
  isCollapsed,
  onToggleCollapse,
  onSelectNode,
  getTierColor,
  getLevelBadge
}: {
  node: ReferralNode;
  isCollapsed?: boolean;
  onToggleCollapse: (uid: string, e: React.MouseEvent) => void;
  onSelectNode: (node: ReferralNode) => void;
  getTierColor: (tier?: UserTier) => string;
  getLevelBadge: (level: number) => { label: string; color: string };
}) {
  const badgeInfo = getLevelBadge(node.level);

  return (
    <div className="flex flex-col items-center relative">
      {/* Linha vertical vinda de cima */}
      <div className="w-0.5 h-6 bg-white/20 -mt-6 mb-0" />

      {/* Card do Nó */}
      <div 
        onClick={() => onSelectNode(node)}
        className={`w-64 p-3.5 rounded-2xl bg-[#14141a] border border-white/10 hover:border-white/30 transition-all cursor-pointer shadow-lg hover:shadow-2xl relative group ${
          node.level === 1 ? 'hover:border-[#c3f400]/50' : node.level === 2 ? 'hover:border-purple-400/50' : 'hover:border-cyan-400/50'
        }`}
      >
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className={`text-[7px] font-black uppercase px-2 py-0.5 rounded-full border ${badgeInfo.color}`}>
            Nível {node.level}
          </span>

          {node.status === 'completed' ? (
            <span className="text-[8px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded font-headline font-bold flex items-center gap-1">
              <CheckCircle2 className="w-2.5 h-2.5" /> Concluída
            </span>
          ) : node.status === 'scheduled' ? (
            <span className="text-[8px] bg-blue-500/20 text-blue-400 border border-blue-500/30 px-1.5 py-0.5 rounded font-headline font-bold flex items-center gap-1">
              <Calendar className="w-2.5 h-2.5" /> Agendada
            </span>
          ) : (
            <span className="text-[8px] bg-zinc-800 text-zinc-500 border border-white/5 px-1.5 py-0.5 rounded font-headline font-bold flex items-center gap-1">
              <Clock className="w-2.5 h-2.5" /> Lead
            </span>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${getTierColor(node.user.tier)} p-0.5 shrink-0`}>
            <div className="w-full h-full bg-[#16161d] rounded-xl flex items-center justify-center font-headline font-black text-sm text-white">
              {node.user.avatar ? (
                <img src={node.user.avatar} alt="" className="w-full h-full object-cover rounded-xl" />
              ) : (
                node.user.name?.charAt(0)?.toUpperCase() || 'U'
              )}
            </div>
          </div>

          <div className="min-w-0 flex-1 text-left">
            <p className="font-headline font-bold text-xs text-white truncate group-hover:text-primary-fixed transition-colors">
              {node.user.name || 'Cliente'}
            </p>
            <p className="text-[9px] text-zinc-500 font-headline truncate">
              {node.user.inviteCode ? `Ref: ${node.user.inviteCode}` : node.user.phone}
            </p>
          </div>
        </div>

        <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between text-[9px] text-zinc-400">
          <span>{node.totalTattoos} tattoo(s)</span>
          <span className="text-primary-fixed font-bold font-headline">+ R$ {node.creditsGenerated}</span>
        </div>

        {/* Botão de Expandir / Recolher se tiver filhos */}
        {node.children.length > 0 && (
          <button
            onClick={(e) => onToggleCollapse(node.user.uid, e)}
            className="absolute -bottom-3 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-zinc-800 border border-white/20 text-[8px] font-headline font-bold text-zinc-300 hover:text-white hover:bg-zinc-700 flex items-center gap-0.5 shadow-md"
          >
            {isCollapsed ? `+${node.children.length}` : `-${node.children.length}`}
          </button>
        )}
      </div>

      {/* Renderização dos Filhos (Recursiva) */}
      {!isCollapsed && node.children.length > 0 && (
        <div className="flex flex-col items-center mt-3 relative">
          <div className="w-0.5 h-6 bg-white/15" />

          {/* Barra horizontal se tiver mais de um filho */}
          {node.children.length > 1 && (
            <div className="w-[80%] h-0.5 bg-white/15 absolute top-6" />
          )}

          <div className="flex justify-center gap-4 md:gap-6 pt-6 flex-wrap">
            {node.children.map(child => (
              <TreeNodeItem
                key={child.user.uid}
                node={child}
                isCollapsed={isCollapsed}
                onToggleCollapse={onToggleCollapse}
                onSelectNode={onSelectNode}
                getTierColor={getTierColor}
                getLevelBadge={getLevelBadge}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
