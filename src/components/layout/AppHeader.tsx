import React from 'react';
import { Button } from "@/components/ui/button";
import { Upload, Sparkles, Settings2, Menu } from "lucide-react";
import { InstagramStatusBadge } from "@/components/integracoes/InstagramIntegracaoModal";
import { ThemeToggleButton } from "@/components/ui/ThemeToggleButton";

export const AppHeader = ({ 
  title, 
  description, 
  profileInfo, 
  igConnected, 
  hasPublishPerm, 
  isPlanning, 
  onOpenIgModal, 
  onOpenConfigWhatsapp, 
  onUpload,
  onToggleSidebar,
  sidebarOpen,
  activeTab = 'calendario'
}: any) => {
  const getTabBadge = () => {
    switch(activeTab) {
      case 'agendamentos': return { label: 'Agenda Buffer', color: 'bg-zinc-800 text-zinc-200 border-zinc-700' };
      case 'insights': return { label: 'Insights Instagram', color: 'bg-zinc-800 text-zinc-200 border-zinc-700' };
      case 'trimestre': return { label: 'Trimestral (90d)', color: 'bg-zinc-800 text-zinc-200 border-zinc-700' };
      default: return { label: 'Galeria Mensal', color: 'bg-zinc-800 text-zinc-200 border-zinc-700' };
    }
  };
  const tabInfo = getTabBadge();

  return (
    <header className="px-4 md:px-6 py-3 border-b border-border flex flex-col md:flex-row justify-between md:items-center gap-3 bg-background/95 backdrop-blur-xl sticky top-0 z-30 shadow-xs">
      <div className="flex items-center gap-3">
        <Button 
          variant={sidebarOpen ? "default" : "outline"} 
          size="sm" 
          className="rounded-xl px-3 gap-2 border-border hover:bg-muted transition-all font-semibold text-xs"
          onClick={onToggleSidebar}
          title="Abrir Menu de Ferramentas IA"
        >
          <Menu className="w-4 h-4 text-foreground" />
          <span className="hidden sm:inline text-foreground">Menu IA & Estratégia</span>
        </Button>
        <div className="flex items-center gap-2.5">
          <div>
            <h1 className="text-lg md:text-xl font-black text-foreground tracking-tight leading-tight">
              {title}
            </h1>
            <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
              {description}
            </p>
          </div>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${tabInfo.color}`}>
            {tabInfo.label}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-3 justify-end">
        <ThemeToggleButton />
        <InstagramStatusBadge 
          connected={igConnected} 
          profile={profileInfo} 
          hasPublishPerm={hasPublishPerm}
          onClick={onOpenIgModal} 
        />
        <Button variant="ghost" size="icon" className="rounded-full h-9 w-9 text-muted-foreground hover:text-foreground" onClick={onOpenConfigWhatsapp}>
          <Settings2 className="w-4 h-4" />
        </Button>
        <Button 
          size="sm" 
          className={`rounded-xl px-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:opacity-90 shadow-md font-bold text-xs ${isPlanning ? 'opacity-50 cursor-not-allowed' : ''}`} 
          onClick={onUpload}
          disabled={isPlanning}
        >
          {isPlanning ? (
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 animate-pulse text-yellow-400" />
              <span>Planejando...</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <Upload className="w-4 h-4" />
              <span>+ Carregar</span>
            </div>
          )}
        </Button>
      </div>
    </header>
  );
};
