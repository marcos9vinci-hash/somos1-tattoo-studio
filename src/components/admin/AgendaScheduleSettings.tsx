// @ts-nocheck
import React, { useState } from 'react';
import { 
  Calendar, Clock, Ban, Trash2, Plus, Minus, Check, CalendarDays,
  CalendarOff, AlertCircle, Sparkles
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { StudioSettings } from '../../types';

interface AgendaScheduleSettingsProps {
  settings: StudioSettings;
  setSettings: (settings: StudioSettings) => void;
  handleUpdateSettings: () => void;
}

export const AgendaScheduleSettings: React.FC<AgendaScheduleSettingsProps> = ({
  settings,
  setSettings,
  handleUpdateSettings
}) => {
  // Estado para Bloqueio de Dia Inteiro
  const [newBlockedDate, setNewBlockedDate] = useState('');
  const [newBlockedDateReason, setNewBlockedDateReason] = useState('');

  // Estado para Bloqueio de Intervalo de Horas
  const [newInterval, setNewInterval] = useState({
    date: '',
    start: '12:00',
    end: '13:00',
    label: ''
  });

  const weekDays = [
    { id: 0, label: 'Domingo', short: 'Dom' },
    { id: 1, label: 'Segunda', short: 'Seg' },
    { id: 2, label: 'Terça', short: 'Ter' },
    { id: 3, label: 'Quarta', short: 'Qua' },
    { id: 4, label: 'Quinta', short: 'Qui' },
    { id: 5, label: 'Sexta', short: 'Sex' },
    { id: 6, label: 'Sábado', short: 'Sáb' },
  ];

  // Alternar Dia da Semana de Atendimento
  const toggleWorkingDay = (dayId: number) => {
    const currentDays = settings.workingDays || [1, 2, 3, 4, 5, 6];
    const updated = currentDays.includes(dayId)
      ? currentDays.filter(d => d !== dayId)
      : [...currentDays, dayId].sort((a, b) => a - b);

    setSettings({
      ...settings,
      workingDays: updated
    });
  };

  // Adicionar Bloqueio de Dia Inteiro
  const handleAddBlockedDate = () => {
    if (!newBlockedDate) return;
    const current = settings.blockedDates || [];
    if (current.includes(newBlockedDate)) {
      alert("Esta data já está bloqueada.");
      return;
    }

    setSettings({
      ...settings,
      blockedDates: [...current, newBlockedDate].sort()
    });
    setNewBlockedDate('');
    setNewBlockedDateReason('');
  };

  // Remover Bloqueio de Dia Inteiro
  const handleRemoveBlockedDate = (dateToRemove: string) => {
    setSettings({
      ...settings,
      blockedDates: (settings.blockedDates || []).filter(d => d !== dateToRemove)
    });
  };

  // Adicionar Bloqueio por Intervalo de Horas
  const handleAddInterval = () => {
    if (!newInterval.date || !newInterval.start || !newInterval.end) {
      alert("Preencha data, hora de início e hora de término.");
      return;
    }

    const currentIntervals = settings.blockedIntervals || [];
    setSettings({
      ...settings,
      blockedIntervals: [...currentIntervals, { ...newInterval }]
    });

    setNewInterval({
      date: '',
      start: '12:00',
      end: '13:00',
      label: ''
    });
  };

  // Remover Bloqueio de Intervalo
  const handleRemoveInterval = (idx: number) => {
    setSettings({
      ...settings,
      blockedIntervals: (settings.blockedIntervals || []).filter((_, i) => i !== idx)
    });
  };

  return (
    <div className="space-y-10">
      
      {/* 1. DIAS DE ATENDIMENTO DA SEMANA */}
      <div className="bg-white/5 border border-white/10 p-6 rounded-3xl space-y-4 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
          <div>
            <h3 className="font-headline text-base uppercase font-bold text-white flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-primary-fixed" />
              Dias de Atendimento do Estúdio
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Selecione os dias da semana em que o estúdio abre para agendamentos. Dias desmarcados ficam automaticamente travados.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5 pt-2">
          {weekDays.map(day => {
            const isActive = (settings.workingDays || [1, 2, 3, 4, 5, 6]).includes(day.id);
            return (
              <button
                key={day.id}
                type="button"
                onClick={() => toggleWorkingDay(day.id)}
                className={cn(
                  "p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1",
                  isActive
                    ? "bg-primary-fixed text-black border-primary-fixed font-black shadow-md shadow-white/10"
                    : "bg-black/40 border-white/10 text-zinc-500 hover:text-white hover:border-white/20"
                )}
              >
                <span className="text-xs uppercase font-headline tracking-wider">{day.short}</span>
                <span className="text-[9px] font-mono uppercase">{isActive ? "Aberto" : "Fechado"}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. HORÁRIO DE FUNCIONAMENTO */}
      <div className="bg-white/5 border border-white/10 p-6 rounded-3xl space-y-4 shadow-xl">
        <div>
          <h3 className="font-headline text-base uppercase font-bold text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-emerald-400" />
            Horário Geral de Funcionamento
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Faixa diária de abertura e encerramento das sessões. Clique nos campos para abrir o relógio.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          <div className="space-y-1.5">
            <label className="text-[11px] uppercase font-headline font-bold text-zinc-400 tracking-wider">
              Abertura do Estúdio
            </label>
            <input
              type="time"
              value={settings.workingHours?.start || '09:00'}
              onClick={(e) => { try { e.currentTarget.showPicker(); } catch {} }}
              onChange={(e) => setSettings({
                ...settings,
                workingHours: { ...(settings.workingHours || { start: '09:00', end: '19:00' }), start: e.target.value }
              })}
              className="w-full bg-black border border-white/10 rounded-xl p-3.5 text-white text-sm cursor-pointer hover:border-white/30 transition-all font-mono font-bold"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] uppercase font-headline font-bold text-zinc-400 tracking-wider">
              Fechamento do Estúdio
            </label>
            <input
              type="time"
              value={settings.workingHours?.end || '19:00'}
              onClick={(e) => { try { e.currentTarget.showPicker(); } catch {} }}
              onChange={(e) => setSettings({
                ...settings,
                workingHours: { ...(settings.workingHours || { start: '09:00', end: '19:00' }), end: e.target.value }
              })}
              className="w-full bg-black border border-white/10 rounded-xl p-3.5 text-white text-sm cursor-pointer hover:border-white/30 transition-all font-mono font-bold"
            />
          </div>
        </div>
      </div>

      {/* 3. DURAÇÃO PADRÃO DOS TRABALHOS (MINUTOS) */}
      <div className="bg-white/5 border border-white/10 p-6 rounded-3xl space-y-4 shadow-xl">
        <div>
          <h3 className="font-headline text-base uppercase font-bold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            Duração Padrão dos Trabalhos (Minutos)
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Tempo reservado na agenda para cada porte de tattoo ou procedimento.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          {(['Pequena', 'Média', 'Grande'] as const).map(size => {
            const currentDuration = settings.durations?.[size] ?? (size === 'Pequena' ? 60 : size === 'Média' ? 120 : 240);
            return (
              <div key={size} className="bg-black/50 p-4 rounded-2xl border border-white/10 space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-xs uppercase font-headline font-bold text-white tracking-wider">
                    Tattoo {size}
                  </label>
                  <span className="text-[10px] text-zinc-500 uppercase font-mono">
                    {Math.floor(currentDuration / 60)}h {currentDuration % 60 > 0 ? `${currentDuration % 60}m` : ''}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center bg-black border border-white/10 rounded-xl overflow-hidden h-11 w-full">
                    <button
                      type="button"
                      onClick={() => setSettings({
                        ...settings,
                        durations: {
                          ...settings.durations,
                          [size]: Math.max(15, currentDuration - 15)
                        }
                      })}
                      className="px-3 hover:bg-white/5 text-zinc-400"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <input 
                      type="number"
                      value={currentDuration}
                      onChange={(e) => setSettings({
                        ...settings,
                        durations: {
                          ...settings.durations,
                          [size]: parseInt(e.target.value) || 30
                        }
                      })}
                      className="w-full bg-transparent text-center text-primary-fixed font-black text-sm focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setSettings({
                        ...settings,
                        durations: {
                          ...settings.durations,
                          [size]: currentDuration + 15
                        }
                      })}
                      className="px-3 hover:bg-white/5 text-zinc-400"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <span className="text-xs text-zinc-500 uppercase font-headline font-bold pr-2">min</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. BLOQUEIO DE DIAS INTEIROS (FERIADOS, FÉRIAS, FOLGAS) */}
      <div className="bg-white/5 border border-white/10 p-6 rounded-3xl space-y-4 shadow-xl">
        <div>
          <h3 className="font-headline text-base uppercase font-bold text-white flex items-center gap-2">
            <CalendarOff className="w-5 h-5 text-red-400" />
            Bloqueio de Dias Inteiros (Férias, Feriados & Folgas)
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Trava datas inteiras na agenda para impedir qualquer novo agendamento nesses dias.
          </p>
        </div>

        {/* Formulário de Adicionar Dia Bloqueado */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-black/50 p-4 rounded-2xl border border-white/10">
          <div className="space-y-1">
            <label className="text-[10px] text-zinc-400 uppercase font-headline tracking-wider">
              Data para Bloquear *
            </label>
            <input
              type="date"
              value={newBlockedDate}
              onClick={(e) => { try { e.currentTarget.showPicker(); } catch {} }}
              onChange={(e) => setNewBlockedDate(e.target.value)}
              className="w-full bg-black border border-white/10 rounded-xl p-3 text-white text-xs cursor-pointer hover:border-white/30 transition-all font-mono"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] text-zinc-400 uppercase font-headline tracking-wider">
              Motivo / Rótulo (Opcional)
            </label>
            <input
              type="text"
              value={newBlockedDateReason}
              onChange={(e) => setNewBlockedDateReason(e.target.value)}
              placeholder="Ex: Feriado, Férias, Reforma"
              className="w-full bg-black border border-white/10 rounded-xl p-3 text-white text-xs hover:border-white/30 transition-all"
            />
          </div>

          <div className="space-y-1 flex flex-col justify-end">
            <button
              type="button"
              onClick={handleAddBlockedDate}
              className="w-full bg-red-500/20 border border-red-500/40 text-red-300 font-headline font-black uppercase text-xs rounded-xl py-3.5 hover:bg-red-500/30 transition-all shadow-md flex items-center justify-center gap-1.5"
            >
              <Ban className="w-4 h-4" />
              Bloquear Dia Inteiro
            </button>
          </div>
        </div>

        {/* Lista de Dias Inteiros Bloqueados */}
        {settings.blockedDates && settings.blockedDates.length > 0 ? (
          <div className="space-y-2 pt-2">
            <label className="text-[10px] uppercase font-headline text-zinc-500 tracking-wider">
              Dias Bloqueados Ativos ({settings.blockedDates.length})
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {settings.blockedDates.map((dateStr: string) => (
                <div key={dateStr} className="flex items-center justify-between bg-black/60 border border-red-500/20 p-3.5 rounded-xl">
                  <div className="flex items-center gap-2">
                    <CalendarOff className="w-4 h-4 text-red-400 shrink-0" />
                    <div>
                      <span className="text-xs text-white font-mono font-bold block">{dateStr}</span>
                      <span className="text-[9px] text-red-400/80 uppercase font-headline">Dia Inteiro Indisponível</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveBlockedDate(dateStr)}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                    title="Desbloquear Dia"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-[10px] text-zinc-500 italic pt-1">Nenhum dia inteiro bloqueado no momento.</p>
        )}
      </div>

      {/* 5. BLOQUEIO DE INTERVALOS ESPECÍFICOS DE HORÁRIOS */}
      <div className="bg-white/5 border border-white/10 p-6 rounded-3xl space-y-4 shadow-xl">
        <div>
          <h3 className="font-headline text-base uppercase font-bold text-white flex items-center gap-2">
            <Ban className="w-5 h-5 text-amber-400" />
            Bloqueio de Intervalos de Horas (Almoço, Manutenção, Consulta)
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Bloqueie apenas algumas horas de um dia específico sem travar a agenda inteira.
          </p>
        </div>

        {/* Formulário de Adicionar Intervalo */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 bg-black/50 p-4 rounded-2xl border border-white/10">
          <div className="space-y-1">
            <label className="text-[10px] text-zinc-400 uppercase font-headline tracking-wider">Data *</label>
            <input
              type="date"
              value={newInterval.date}
              onClick={(e) => { try { e.currentTarget.showPicker(); } catch {} }}
              onChange={(e) => setNewInterval({ ...newInterval, date: e.target.value })}
              className="w-full bg-black border border-white/10 rounded-xl p-3 text-white text-xs cursor-pointer hover:border-white/30 transition-all font-mono"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] text-zinc-400 uppercase font-headline tracking-wider">Hora Início *</label>
            <input
              type="time"
              value={newInterval.start}
              onClick={(e) => { try { e.currentTarget.showPicker(); } catch {} }}
              onChange={(e) => setNewInterval({ ...newInterval, start: e.target.value })}
              className="w-full bg-black border border-white/10 rounded-xl p-3 text-white text-xs cursor-pointer hover:border-white/30 transition-all font-mono"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] text-zinc-400 uppercase font-headline tracking-wider">Hora Fim *</label>
            <input
              type="time"
              value={newInterval.end}
              onClick={(e) => { try { e.currentTarget.showPicker(); } catch {} }}
              onChange={(e) => setNewInterval({ ...newInterval, end: e.target.value })}
              className="w-full bg-black border border-white/10 rounded-xl p-3 text-white text-xs cursor-pointer hover:border-white/30 transition-all font-mono"
            />
          </div>

          <div className="space-y-1 flex flex-col justify-end">
            <button
              type="button"
              onClick={handleAddInterval}
              className="w-full bg-primary-fixed text-black font-headline font-black uppercase text-xs rounded-xl py-3.5 hover:scale-[0.98] transition-all shadow-md flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Adicionar Horário
            </button>
          </div>
        </div>

        {/* Lista de Intervalos Bloqueados */}
        {settings.blockedIntervals && settings.blockedIntervals.length > 0 ? (
          <div className="space-y-2 pt-2">
            <label className="text-[10px] uppercase font-headline text-zinc-500 tracking-wider">
              Intervalos Bloqueados ({settings.blockedIntervals.length})
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {settings.blockedIntervals.map((block: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between bg-black/60 border border-white/10 p-3.5 rounded-xl">
                  <div className="flex items-center gap-2.5">
                    <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                    <div>
                      <span className="text-xs text-white font-mono font-bold block">
                        {block.date}
                      </span>
                      <span className="text-[10px] text-zinc-400 font-mono">
                        {block.start} às {block.end} {block.label ? `• ${block.label}` : ''}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveInterval(idx)}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                    title="Excluir Intervalo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-[10px] text-zinc-500 italic pt-1">Nenhum intervalo horário bloqueado.</p>
        )}
      </div>

      {/* BOTÃO SALVAR TUDO DA AGENDA */}
      <div className="pt-4">
        <button 
          type="button"
          onClick={handleUpdateSettings}
          className="w-full bg-primary-fixed text-black h-16 rounded-2xl font-headline font-black uppercase tracking-widest shadow-xl shadow-primary-fixed/20 hover:scale-[0.99] transition-all text-sm flex items-center justify-center gap-2"
        >
          <Check className="w-5 h-5" />
          Salvar Horários & Bloqueios da Agenda
        </button>
      </div>

    </div>
  );
};
