import React from 'react';
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { 
  Sparkles, 
  CalendarDays, 
  Target, 
  X, 
  ChevronRight, 
  LayoutGrid, 
  CalendarCheck2, 
  BarChart3, 
  Layers 
} from "lucide-react";
import SugerirEspacos from "../galeria/SugerirEspacos";

export const Sidebar = ({ 
  isOpen,
  onClose,
  activeTab,
  setActiveTab,
  setShowEstudioIA, 
  setShowPlanoSemanal, 
  setShowNicheConfig, 
  profileInfo, 
  posts, 
  setCurrentDate 
}: any) => {
  const navItems = [
    { id: 'calendario', label: 'Galeria', icon: LayoutGrid, desc: 'Grade visual do mês' },
    { id: 'agendamentos', label: 'Agenda Buffer', icon: CalendarCheck2, desc: 'Posts agendados na fila' },
    { id: 'insights', label: 'Insights Instagram', icon: BarChart3, desc: 'Alcance e métricas reais' },
    { id: 'trimestre', label: 'Planejamento Trimestral', icon: Layers, desc: 'Visão de 90 dias' },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop Blur Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 transition-opacity"
          />

          {/* Off-Canvas Slide-over Panel (Abre da esquerda, lado do botão hambúrguer) */}
          <motion.aside
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="fixed top-0 left-0 h-full w-full max-w-sm bg-card text-card-foreground border-r border-border shadow-2xl z-50 flex flex-col overflow-hidden"
          >
            {/* Header da Sidebar */}
            <div className="p-4 border-b border-border flex items-center justify-between bg-muted/40">
              <div className="flex items-center gap-2.5">
                <img src="/somos1-logo.png" alt="Somos 1" className="w-8 h-8 rounded-lg object-contain bg-background p-0.5 border border-border" />
                <div>
                  <h3 className="text-sm font-black tracking-tight text-foreground">Somos 1 Studio</h3>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Menu IA & Estratégia</p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted"
                onClick={onClose}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Conteúdo com Scroll */}
            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              {/* Seção 1: Navegação Principal */}
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 px-1">Visualizações</p>
                <div className="space-y-1">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setActiveTab(item.id);
                          onClose();
                        }}
                        className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all ${
                          isActive 
                            ? 'bg-foreground text-background font-black border border-foreground shadow-md' 
                            : 'hover:bg-muted text-muted-foreground hover:text-foreground border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-1.5 rounded-lg ${isActive ? 'bg-background text-foreground' : 'bg-muted text-muted-foreground'}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-xs font-semibold">{item.label}</div>
                            <div className="text-[10px] opacity-80 font-normal">{item.desc}</div>
                          </div>
                        </div>
                        {isActive && <div className="w-1.5 h-1.5 rounded-full bg-background" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Seção 2: Estúdio IA */}
              <div className="p-3.5 bg-muted/40 rounded-2xl border border-border shadow-xs relative overflow-hidden">
                <div className="flex items-start gap-2.5">
                  <div className="p-2 bg-muted rounded-xl text-foreground mt-0.5 shrink-0">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <h4 className="text-xs font-black text-foreground uppercase tracking-wider">
                      Estúdio de Campanhas IA
                    </h4>
                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                      Planejamento e agendamento em lote com narrativa contínua e horários estratégicos.
                    </p>
                    <Button 
                      size="sm" 
                      className="w-full h-8 mt-2 text-xs font-black bw-invert-btn gap-1.5 rounded-xl shadow-md"
                      onClick={() => {
                        onClose();
                        setShowEstudioIA(true);
                      }}
                    >
                      <Sparkles className="w-3.5 h-3.5" /> Iniciar Co-Criação IA
                    </Button>
                  </div>
                </div>
              </div>

              {/* Seção 3: Ferramentas Estratégicas */}
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 px-1">Estratégia & Otimização</p>
                <div className="space-y-1.5">
                  <Button 
                    variant="outline"
                    className="w-full h-11 justify-between bg-zinc-900/70 hover:bg-zinc-800 border-zinc-800 rounded-xl px-3 text-xs font-semibold text-zinc-200 group transition-all"
                    onClick={() => {
                      onClose();
                      setShowPlanoSemanal(true);
                    }}
                  >
                    <div className="flex items-center gap-2.5">
                      <CalendarDays className="w-4 h-4 text-purple-400" />
                      <span>Planejamento Semanal</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:translate-x-0.5 transition-transform" />
                  </Button>

                  {profileInfo && (
                    <Button 
                      variant="outline"
                      className="w-full h-11 justify-between bg-zinc-900/70 hover:bg-zinc-800 border-zinc-800 rounded-xl px-3 text-xs font-semibold text-zinc-200 group transition-all"
                      onClick={() => {
                        onClose();
                        setShowNicheConfig(true);
                      }}
                    >
                      <div className="flex items-center gap-2.5">
                        <Target className="w-4 h-4 text-indigo-400" />
                        <span>Estratégia de Nicho (Comporta 0)</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:translate-x-0.5 transition-transform" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Seção 4: Sugestão de Espaços / Lacunas */}
              <div className="pt-1">
                <SugerirEspacos 
                  posts={posts} 
                  onSelect={(s: any) => {
                    setCurrentDate(s.date);
                    setActiveTab('calendario');
                    onClose();
                  }} 
                />
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};
