import React, { useState } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, addWeeks, subWeeks, addDays, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Ban, X, Clock, User, Ruler, Plus, UserPlus, Settings as SettingsIcon, Sliders } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Booking, StudioSettings, BookingStatus } from '../../types';
import { db } from '../../lib/firebase';
import { collection, addDoc, serverTimestamp, doc, setDoc } from 'firebase/firestore';
import NovoAgendamentoWizard from './NovoAgendamentoWizard';
import DetalhesAgendamentoModal from './DetalhesAgendamentoModal';
import { AgendaScheduleSettings } from './AgendaScheduleSettings';
interface UnifiedCalendarProps {
  bookings: Booking[];
  settings: StudioSettings;
  onDateSelect?: (date: Date) => void;
  onBookingCreated?: () => void;
  onEditBooking?: (booking: Booking) => void;
}

interface QuickBookingForm {
  userName: string;
  userId: string;
  time: string;
  size: 'Pequena' | 'Média' | 'Grande';
  priceEstimated: number;
}

// CORES E BORDAS DOS AGENDAMENTOS (Confirmado: verde | Faltou: vermelho | Agendado: amarelo)
function getBookingStatusTheme(status: string) {
  switch (status) {
    case BookingStatus.APPROVED:
    case BookingStatus.DEPOSIT_PAID:
      return {
        badgeBg: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50',
        ringClass: 'ring-2 ring-emerald-500/80 shadow-emerald-500/10',
        dotColor: 'bg-emerald-500',
        label: 'Confirmado'
      };
    case BookingStatus.NO_SHOW:
    case BookingStatus.REJECTED:
      return {
        badgeBg: 'bg-red-500/20 text-red-400 border border-red-500/50',
        ringClass: 'ring-2 ring-red-500/80 shadow-red-500/10',
        dotColor: 'bg-red-500',
        label: 'Faltou'
      };
    case BookingStatus.PENDING_APPROVAL:
    case BookingStatus.DEPOSIT_PENDING:
    default:
      return {
        badgeBg: 'bg-amber-500/20 text-amber-400 border border-amber-500/50',
        ringClass: 'ring-2 ring-amber-500/80 shadow-amber-500/10',
        dotColor: 'bg-amber-500',
        label: 'Agendado'
      };
  }
}

export default function UnifiedCalendar({ bookings, settings, onDateSelect, onBookingCreated, onEditBooking }: UnifiedCalendarProps) {
  const [view, setView] = useState<'month' | 'week' | 'day'>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Modals state
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardInitialDate, setWizardInitialDate] = useState<Date | null>(null);
  const [wizardInitialTime, setWizardInitialTime] = useState<string | null>(null);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [selectedBookingDetails, setSelectedBookingDetails] = useState<Booking | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [localSettings, setLocalSettings] = useState<StudioSettings>(settings);

  // Sincroniza localSettings quando settings mudar
  React.useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleSaveSettings = async () => {
    try {
      await setDoc(doc(db, 'studio_settings', 'main'), localSettings);
      alert('Configurações da agenda salvas com sucesso!');
      setIsSettingsOpen(false);
      onBookingCreated?.();
    } catch (err: any) {
      alert('Erro ao salvar configurações: ' + err.message);
    }
  };

  const next = () => {
    if (view === 'month') setCurrentDate(addMonths(currentDate, 1));
    if (view === 'week') setCurrentDate(addWeeks(currentDate, 1));
    if (view === 'day') setCurrentDate(addDays(currentDate, 1));
  };

  const prev = () => {
    if (view === 'month') setCurrentDate(subMonths(currentDate, 1));
    if (view === 'week') setCurrentDate(subWeeks(currentDate, 1));
    if (view === 'day') setCurrentDate(subDays(currentDate, 1));
  };

  const openDayModal = (day: Date, hour?: number) => {
    setWizardInitialDate(day);
    if (hour !== undefined) {
      setWizardInitialTime(`${hour.toString().padStart(2, '0')}:00`);
    } else {
      setWizardInitialTime(settings.workingHours?.start || '10:00');
    }
    setIsWizardOpen(true);
  };

  const handleDayClick = (day: Date) => {
    // Mês → vai para visão Dia
    setCurrentDate(day);
    setView('day');
    onDateSelect?.(day);
  };

  // Quick booking handle removed, handled by wizard now

  const isBlockedDay = (day: Date) => !settings?.workingDays?.includes(day.getDay());

  // ─── HEADER ──────────────────────────────────────────────────
  const renderHeader = () => (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-6 bg-card p-4 rounded-2xl border border-border shadow-xs">
      <div className="flex items-center gap-4 flex-wrap">
        <h2 className="font-headline text-lg font-black text-foreground uppercase tracking-widest">
          {view === 'day'
            ? format(currentDate, "dd 'de' MMMM", { locale: ptBR })
            : format(currentDate, 'MMMM yyyy', { locale: ptBR })}
        </h2>
        <div className="flex bg-muted p-1 rounded-xl border border-border">
          {(['month', 'week', 'day'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-[10px] font-headline uppercase tracking-widest transition-all',
                view === v ? 'bg-foreground text-background font-black shadow-xs' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {v === 'month' ? 'Mês' : v === 'week' ? 'Semana' : 'Dia'}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2.5 justify-between sm:justify-end">
        <button
          type="button"
          onClick={() => openDayModal(currentDate)}
          className="flex items-center gap-1.5 px-4 py-2 bg-primary-fixed text-black font-headline font-black text-xs uppercase tracking-wider rounded-xl hover:opacity-90 transition-all shadow-md active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Novo Agendamento</span>
        </button>
        <button
          type="button"
          onClick={() => setIsSettingsOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2 bg-muted hover:bg-muted/80 text-foreground font-headline font-bold text-xs uppercase tracking-wider rounded-xl border border-border transition-all active:scale-95 shrink-0"
          title="Configurações Completas da Agenda"
        >
          <Sliders className="w-4 h-4" />
          <span className="hidden sm:inline">Configurar Agenda</span>
        </button>
        <div className="flex gap-1.5">
          <button onClick={prev} className="p-2 hover:bg-muted rounded-xl border border-border text-foreground transition-colors" title="Anterior">
            <ChevronLeft className="w-5 h-5 text-foreground" />
          </button>
          <button onClick={next} className="p-2 hover:bg-muted rounded-xl border border-border text-foreground transition-colors" title="Próximo">
            <ChevronRight className="w-5 h-5 text-foreground" />
          </button>
        </div>
      </div>
    </div>
  );

  // ─── MÊS ─────────────────────────────────────────────────────
  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });
    const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

    return (
      <div className="grid grid-cols-7 gap-px bg-border rounded-2xl overflow-hidden border border-border shadow-xs">
        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
          <div key={d} className="bg-muted/40 p-3 text-center border-b border-border">
            <span className="text-[10px] font-headline uppercase tracking-widest text-muted-foreground font-black">{d}</span>
          </div>
        ))}
        {calendarDays.map((day, idx) => {
          const blocked = isBlockedDay(day);
          const isSelected = isSameDay(day, currentDate);
          const dayStr = format(day, 'yyyy-MM-dd');
          const dayBookings = bookings.filter(b => b.date === dayStr);
          const isCurrentMonth = isSameMonth(day, monthStart);
          const hasSpecificBlocks = settings.blockedIntervals?.some(b => b.date === dayStr);

          return (
            <div
              key={idx}
              onClick={() => isCurrentMonth && handleDayClick(day)}
              className={cn(
                'min-h-[90px] p-2 transition-all relative group',
                isCurrentMonth ? 'cursor-pointer' : 'opacity-30 pointer-events-none bg-muted/20',
                isCurrentMonth ? (blocked || hasSpecificBlocks ? 'bg-destructive/5 hover:bg-destructive/10' : 'bg-card hover:bg-muted/40') : 'bg-muted/10',
                isSelected && 'ring-1 ring-inset ring-foreground z-10 bg-muted/30',
              )}
            >
              <div className="flex justify-between items-start">
                <span className={cn(
                  'text-[11px] font-headline font-black w-6 h-6 flex items-center justify-center rounded-full',
                  isSameDay(day, new Date()) ? 'bg-foreground text-background font-bold shadow-xs' : 'text-muted-foreground'
                )}>
                  {format(day, 'd')}
                </span>
                {(blocked || hasSpecificBlocks) && <Ban className="w-3 h-3 text-destructive/50" />}
              </div>
              <div className="mt-1.5 space-y-0.5">
                {dayBookings.slice(0, 3).map(b => {
                  const theme = getBookingStatusTheme(b.status);
                  return (
                    <div 
                      key={b.id} 
                      onClick={(e) => { e.stopPropagation(); setSelectedBookingDetails(b); }}
                      className={cn(
                        "text-[8px] px-1.5 py-0.5 rounded truncate font-headline uppercase transition-all z-20 cursor-pointer font-bold flex items-center gap-1",
                        theme.badgeBg
                      )}
                      title={`${b.userName} - ${theme.label}`}
                    >
                      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", theme.dotColor)} />
                      <span className="truncate">{b.time} · {b.userName || 'Tattoo'}</span>
                    </div>
                  );
                })}
                {dayBookings.length > 3 && (
                  <div className="text-[8px] text-muted-foreground pl-1 font-headline font-bold">+{dayBookings.length - 3}</div>
                )}
              </div>
              {/* Hover overlay */}
              {isCurrentMonth && !blocked && (
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-foreground/5">
                  <span className="text-[9px] font-headline font-black text-background uppercase tracking-widest px-2.5 py-1 bg-foreground rounded-lg border border-border shadow-xs">
                    Ver Dia
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // ─── SEMANA ───────────────────────────────────────────────────
  const renderWeekView = () => {
    const startDate = startOfWeek(currentDate, { weekStartsOn: 0 });
    const weekDays = eachDayOfInterval({ start: startDate, end: addDays(startDate, 6) });
    const hours = Array.from({ length: 15 }, (_, i) => i + 8);

    return (
      <div className="bg-card rounded-2xl border border-border shadow-xs overflow-hidden">
        <div className="grid grid-cols-8 border-b border-border">
          <div className="p-4 border-r border-border bg-muted/20" />
          {weekDays.map(day => (
            <button
              key={day.toString()}
              onClick={() => handleDayClick(day)}
              className={cn(
                'p-4 text-center border-r border-border hover:bg-muted/40 transition-all',
                isSameDay(day, new Date()) && 'bg-muted/50'
              )}
            >
              <p className="text-[8px] text-muted-foreground font-headline font-bold uppercase tracking-widest">{format(day, 'EEE', { locale: ptBR })}</p>
              <p className={cn('text-sm font-headline font-black', isSameDay(day, new Date()) ? 'text-foreground underline decoration-2' : 'text-foreground')}>
                {format(day, 'dd')}
              </p>
              {isBlockedDay(day) && <Ban className="w-3 h-3 text-destructive/50 mx-auto mt-1" />}
            </button>
          ))}
        </div>
        <div className="overflow-y-auto max-h-[600px] scrollbar-hide">
          {hours.map(hour => (
            <div key={hour} className="grid grid-cols-8 border-b border-border/50">
              <div className="p-3 text-[10px] text-muted-foreground font-headline font-bold border-r border-border text-right pr-4 bg-muted/10">
                {hour}:00
              </div>
              {weekDays.map(day => {
                const dayStr = format(day, 'yyyy-MM-dd');
                const hourPrefix = `${hour.toString().padStart(2, '0')}:`;
                const blocked = isBlockedDay(day);
                const specificBlock = settings.blockedIntervals?.find(b =>
                  b.date === dayStr && b.start.startsWith(hourPrefix)
                );
                const isBlocked = blocked || !!specificBlock;
                const booking = bookings.find(b => b.date === dayStr && b.time.startsWith(hourPrefix));

                return (
                  <div
                    key={day.toString()}
                    onClick={() => !isBlocked && openDayModal(day, hour)}
                    className={cn(
                      'p-1 border-r border-border/50 min-h-[52px] relative group',
                      isBlocked ? 'bg-destructive/5 cursor-not-allowed' : 'cursor-pointer hover:bg-muted/40'
                    )}
                  >
                    {specificBlock && (
                      <div className="absolute inset-x-1 top-1 text-[7px] text-destructive font-headline font-bold uppercase text-center truncate">
                        {specificBlock.label || 'Bloqueado'}
                      </div>
                    )}
                    {booking && (() => {
                      const theme = getBookingStatusTheme(booking.status);
                      return (
                        <div 
                          className={cn(
                            "absolute inset-1 rounded-lg p-1.5 overflow-hidden z-20 cursor-pointer transition-all shadow-xs flex flex-col justify-between",
                            theme.badgeBg,
                            theme.ringClass
                          )}
                          onClick={(e) => { e.stopPropagation(); setSelectedBookingDetails(booking); }}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <p className="text-[8px] font-black uppercase truncate">{booking.userName}</p>
                            <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", theme.dotColor)} />
                          </div>
                          <p className="text-[7px] opacity-80 uppercase">{booking.time} · {theme.label}</p>
                        </div>
                      );
                    })()}
                    {!isBlocked && !booking && (
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <span className="text-[8px] text-foreground font-headline font-black">+ Agendar</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ─── DIA ─────────────────────────────────────────────────────
  const renderDayView = () => {
    const hours = Array.from({ length: 15 }, (_, i) => i + 8);
    const dayStr = format(currentDate, 'yyyy-MM-dd');
    const dayBookings = bookings.filter(b => b.date === dayStr);
    const isDayOff = isBlockedDay(currentDate);

    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-card rounded-2xl border border-border shadow-xs overflow-hidden">
          <div className="p-4 border-b border-border bg-muted/30">
            <h3 className="text-xs font-headline font-black text-foreground uppercase tracking-widest">
              Grade de Horários · {format(currentDate, "dd 'de' MMMM", { locale: ptBR })}
            </h3>
            {isDayOff && (
              <p className="text-[10px] text-destructive font-headline font-bold uppercase mt-1 flex items-center gap-1">
                <Ban className="w-3 h-3" /> Folga do Estúdio
              </p>
            )}
          </div>
          <div className="p-4 space-y-2">
            {hours.map(hour => {
              const hourPrefix = `${hour.toString().padStart(2, '0')}:`;
              const booking = dayBookings.find(b => b.time.startsWith(hourPrefix));
              const specificBlock = settings.blockedIntervals?.find(b =>
                b.date === dayStr && b.start.startsWith(hourPrefix)
              );
              const isBlockedHour = isDayOff || !!specificBlock;
              const outsideWorkHours =
                settings.workingHours &&
                (hourPrefix < settings.workingHours.start.substring(0, 3) || hourPrefix >= settings.workingHours.end.substring(0, 3));

              return (
                <div
                  key={hour}
                  onClick={() => !isBlockedHour && !outsideWorkHours && !booking && openDayModal(currentDate, hour)}
                  className={cn(
                    'flex items-center gap-4 group rounded-xl border transition-all p-4',
                    booking
                      ? (() => {
                          const theme = getBookingStatusTheme(booking.status);
                          return cn(theme.badgeBg, theme.ringClass, 'cursor-pointer');
                        })()
                      : isBlockedHour
                      ? 'bg-destructive/5 border-destructive/10 opacity-60 cursor-not-allowed'
                      : outsideWorkHours
                      ? 'bg-muted/10 border-border/30 opacity-40 cursor-not-allowed'
                      : 'bg-card border-border hover:bg-muted/40 cursor-pointer'
                  )}
                >
                  <span className="w-12 text-[10px] text-muted-foreground font-headline font-bold shrink-0">{hourPrefix}00</span>
                  <div className="flex-1">
                    {booking ? (() => {
                      const theme = getBookingStatusTheme(booking.status);
                      return (
                        <div className="flex items-center justify-between cursor-pointer" onClick={() => setSelectedBookingDetails(booking)}>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className={cn("w-2 h-2 rounded-full", theme.dotColor)} />
                              <p className="text-xs font-black uppercase tracking-widest">{booking.userName}</p>
                            </div>
                            <p className="text-[10px] opacity-80 uppercase mt-0.5">{booking.time} · {booking.size} · R$ {booking.priceEstimated}</p>
                          </div>
                          <span className={cn("text-[9px] px-2.5 py-1 rounded-full font-black uppercase tracking-wider", theme.badgeBg)}>
                            {theme.label}
                          </span>
                        </div>
                      );
                    })() : (
                      <span className="text-[10px] text-muted-foreground font-headline uppercase tracking-widest group-hover:text-foreground flex items-center gap-2 transition-colors">
                        {isBlockedHour
                          ? <><Ban className="w-3 h-3 text-destructive" /> {specificBlock?.label || 'Bloqueado'}</>
                          : outsideWorkHours
                          ? 'Fora do expediente'
                          : <><span className="opacity-0 group-hover:opacity-100 transition-opacity">+ </span>Horário Livre</>
                        }
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sidebar resumo */}
        <div className="space-y-4">
          <div className="glass-panel p-6 rounded-2xl border border-border bg-card shadow-xs">
            <h4 className="text-[10px] font-headline font-black text-foreground uppercase tracking-widest mb-4">Resumo do Dia</h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Agendamentos</span>
                <span className="text-2xl font-black text-foreground">{dayBookings.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Faturamento Previsto</span>
                <span className="text-lg font-black text-foreground">
                  R$ {dayBookings.reduce((acc, b) => acc + (b.priceEstimated || 0), 0)}
                </span>
              </div>
            </div>
          </div>

          <div className="glass-panel p-6 rounded-2xl border border-white/5">
            <h4 className="text-[10px] font-headline font-black text-zinc-500 uppercase tracking-widest mb-4">Agenda do Dia</h4>
            <div className="space-y-3">
              {dayBookings.sort((a, b) => a.time.localeCompare(b.time)).map(b => {
                const theme = getBookingStatusTheme(b.status);
                return (
                  <div 
                    key={b.id} 
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border",
                      theme.badgeBg,
                      theme.ringClass
                    )}
                    onClick={() => setSelectedBookingDetails(b)}
                  >
                    <div className="w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center text-[10px] font-black border border-white/10 shrink-0">
                      {b.userName?.charAt(0) || '?'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-[10px] font-black uppercase truncate">{b.userName}</p>
                        <span className="text-[8px] font-bold uppercase">{theme.label}</span>
                      </div>
                      <p className="text-[8px] opacity-70 uppercase">{b.time} · {b.size}</p>
                    </div>
                  </div>
                );
              })}
              {dayBookings.length === 0 && (
                <p className="text-[10px] text-zinc-600 font-headline text-center py-4">
                  {isDayOff ? 'Dia de folga.' : 'Nenhum agendamento.'}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ─── MODAL AGENDAMENTO RÁPIDO ────────────────────────────────
  const renderModals = () => {
    return (
      <>
        <NovoAgendamentoWizard 
          isOpen={isWizardOpen}
          onClose={() => {
            setIsWizardOpen(false);
            setEditingBooking(null);
          }}
          onSuccess={() => {
            setIsWizardOpen(false);
            setEditingBooking(null);
            onBookingCreated?.();
          }}
          initialDate={wizardInitialDate}
          initialTime={wizardInitialTime}
          agendamentoParaEditar={editingBooking}
        />
        <DetalhesAgendamentoModal
          agendamento={selectedBookingDetails}
          settings={settings}
          onClose={() => setSelectedBookingDetails(null)}
          onEdit={(b) => {
            setSelectedBookingDetails(null);
            setEditingBooking(b);
            setIsWizardOpen(true);
          }}
          onStatusChange={() => {
            onBookingCreated?.(); // Refresh view
          }}
        />

        {/* MODAL COM TODAS AS CONFIGURAÇÕES DA AGENDA */}
        {isSettingsOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in overflow-y-auto">
            <div className="bg-zinc-950 border border-white/10 rounded-2xl w-full max-w-4xl shadow-2xl relative my-6 max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95">
              <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between shrink-0 bg-zinc-950">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-primary-fixed/20 text-primary-fixed flex items-center justify-center font-bold">
                    <Sliders className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white uppercase font-headline tracking-wide">Configurações Completas da Agenda</h3>
                    <p className="text-[10px] text-zinc-400 font-headline">Dias, horários de funcionamento e bloqueios de intervalo</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(false)}
                  className="p-1.5 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 sm:p-6 overflow-y-auto flex-1 scrollbar-thin">
                <AgendaScheduleSettings
                  settings={localSettings}
                  setSettings={setLocalSettings}
                  handleUpdateSettings={handleSaveSettings}
                />
              </div>
            </div>
          </div>
        )}
      </>
    );
  };

  return (
    <div className="w-full">
      {renderHeader()}
      {view === 'month' && renderMonthView()}
      {view === 'week' && renderWeekView()}
      {view === 'day' && renderDayView()}
      {renderModals()}
    </div>
  );
}
