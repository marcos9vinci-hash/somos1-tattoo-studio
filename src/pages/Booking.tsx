import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar as CalendarIcon, Clock, CheckCircle2, ChevronRight, Menu, Info, Radio, Zap, Loader2, AlertCircle, Ban, Upload, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { db, auth } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, updateDoc, doc, increment, getDoc, getDocs, query, where } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { TransactionType, BookingStatus, OperationType, StudioSettings, NotificationType, UserTier, UserRole } from '../types';
import { handleFirestoreError } from '../lib/error-handler';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay, 
  addDays, 
  isBefore, 
  startOfDay 
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft } from 'lucide-react';
import { whatsappService } from '../lib/whatsappService';

type Size = 'Pequena' | 'Média' | 'Grande';

export default function Booking() {
  const { profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [size, setSize] = useState<Size>('Média');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState('');
  const [regiaoCorpo, setRegiaoCorpo] = useState('Antebraço');
  const [descricaoIdeia, setDescricaoIdeia] = useState('');
  const [fotosReferencia, setFotosReferencia] = useState<string[]>([]);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<StudioSettings | null>(null);
  const [bookingsOnDay, setBookingsOnDay] = useState(0);

  const handleUploadFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files: File[] = e.target.files ? Array.from(e.target.files) : [];
    if (!files.length) return;
    setUploadingImg(true);

    const readAsDataURL = (file: File): Promise<string> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    };

    try {
      const urls = await Promise.all(files.map(f => readAsDataURL(f)));
      setFotosReferencia(prev => [...prev, ...urls]);
    } catch (err) {
      console.error("Erro ao carregar imagem de referência:", err);
    } finally {
      setUploadingImg(false);
      e.target.value = "";
    }
  };

  const handleRemoverFoto = (idx: number) => {
    setFotosReferencia(prev => prev.filter((_, i) => i !== idx));
  };

  useEffect(() => {
    const fetchSettings = async () => {
      const snap = await getDoc(doc(db, 'studio_settings', 'main'));
      if (snap.exists()) {
        setSettings(snap.data() as StudioSettings);
      } else {
        // Fallback defaults
        setSettings({
          workingDays: [1, 2, 3, 4, 5, 6],
          workingHours: { start: '09:00', end: '19:00' },
          durations: { Pequena: 60, Média: 120, Grande: 240 },
          blockedDates: [],
          blockedIntervals: [],
          maxSessionsPerDay: 5,
          adminIds: [],
          allowIndicatorBooking: true,
          allowArtistBooking: true
        });
      }
    };
    fetchSettings();
  }, []);

  const [existingBookings, setExistingBookings] = useState<any[]>([]);

  useEffect(() => {
    if (selectedDate) {
      const fetchBookingsOnDay = async () => {
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        const q = query(collection(db, 'bookings'), where('date', '==', dateStr));
        const snap = await getDocs(q);
        const bookings = snap.docs.map(doc => doc.data());
        setBookingsOnDay(snap.size);
        setExistingBookings(bookings);
      };
      fetchBookingsOnDay();
    }
  }, [selectedDate]);

  const priceEstimates = {
    'Pequena': { min: 100, max: 300 },
    'Média': { min: 300, max: 700 },
    'Grande': { min: 700, max: 1500 }
  };

  const estimatedValue = size === 'Pequena' ? 200 : size === 'Média' ? 500 : 1000;
  const creditsAvailable = profile?.creditsBalance || 0;
  const maxCreditUsage = Math.min(creditsAvailable, estimatedValue * 0.5); // Max 50% discount
  const depositValue = 80;

  const handleConfirm = async () => {
    if (!profile || !selectedDate || !selectedTime) return;
    setLoading(true);
    
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');

      // 1. Create Booking
      const bookingRef = await addDoc(collection(db, 'bookings'), {
        userId: profile.uid,
        userName: profile.name,
        userPhone: profile.phone || '',
        artistId: null, // Ready for multi-artist
        size,
        regiao_corpo: regiaoCorpo,
        fotos_referencia: fotosReferencia,
        descricao_servico: `Tatuagem (${size}) - ${regiaoCorpo}${descricaoIdeia ? ` - Obs: ${descricaoIdeia}` : ''}`,
        observacoes: descricaoIdeia,
        date: dateStr,
        time: selectedTime,
        status: BookingStatus.PENDING_APPROVAL,
        priceEstimated: estimatedValue,
        depositPaid: 0,
        creditsUsed: maxCreditUsage,
        createdAt: serverTimestamp()
      });

      // 2. If credits used, deduct and log
      if (maxCreditUsage > 0) {
        await updateDoc(doc(db, 'users', profile.uid), {
          creditsBalance: increment(-maxCreditUsage)
        });

        await addDoc(collection(db, 'transactions'), {
          userId: profile.uid,
          amount: -maxCreditUsage,
          type: TransactionType.BOOKING_DISCOUNT,
          description: `Desconto em Agendamento (${size})`,
          createdAt: serverTimestamp()
        });
      }

      // 3. Notify Admin(s)
      const adminsSnap = await getDocs(query(collection(db, 'users'), where('role', '==', 'admin')));
      for (const adminDoc of adminsSnap.docs) {
        await addDoc(collection(db, 'notifications'), {
          userId: adminDoc.id,
          type: NotificationType.SYSTEM,
          title: 'Novo agendamento! 📅',
          message: `${profile.name} solicitou uma tattoo (${size}) em ${regiaoCorpo} para ${dateStr}.`,
          createdAt: serverTimestamp(),
          read: false
        });
      }

      await refreshProfile();

      // 1. DISPARO DO CICLO DE AGENDAMENTO (Confirmação Imediata + Lembrete + Follow-up)
      whatsappService.triggerBookingLifecycle({
        id: bookingRef.id,
        userName: profile.name,
        userPhone: profile.phone,
        date: dateStr,
        time: selectedTime,
        descricao_servico: `Tatuagem (${size}) - ${regiaoCorpo}`
      } as any, false, settings || undefined);

      navigate('/');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'bookings');
    } finally {
      setLoading(false);
    }
  };

  const [currentMonth, setCurrentMonth] = useState(new Date());

  const renderHeader = () => {
    return (
      <div className="flex items-center justify-between px-2 mb-4">
        <h4 className="font-headline text-sm uppercase tracking-widest text-white">
          {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
        </h4>
        <div className="flex gap-2">
          <button 
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-2 hover:bg-white/5 rounded-lg transition-colors border border-white/5"
          >
            <ChevronLeft className="w-4 h-4 text-zinc-400" />
          </button>
          <button 
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-2 hover:bg-white/5 rounded-lg transition-colors border border-white/5"
          >
            <ChevronRight className="w-4 h-4 text-zinc-400" />
          </button>
        </div>
      </div>
    );
  };

  const renderDays = () => {
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    return (
      <div className="grid grid-cols-7 mb-2">
        {days.map((day) => (
          <div key={day} className="text-center text-[10px] font-headline uppercase tracking-widest text-zinc-600 font-bold">
            {day}
          </div>
        ))}
      </div>
    );
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const rows = [];
    let days = [];
    let day = startDate;
    let formattedDate = "";

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        formattedDate = format(day, "d");
        const cloneDay = day;
        const available = isDayAvailable(cloneDay) && !isBefore(cloneDay, startOfDay(new Date()));
        const isSelected = selectedDate && isSameDay(cloneDay, selectedDate);
        const isCurrentMonth = isSameMonth(cloneDay, monthStart);

        days.push(
          <button
            key={day.toString()}
            disabled={!available || !isCurrentMonth}
            onClick={() => setSelectedDate(cloneDay)}
            className={cn(
              "relative h-12 w-full flex flex-col items-center justify-center transition-all duration-300 border-t border-l border-white/5",
              isSelected 
                ? "bg-primary-fixed text-black font-black z-10 shadow-[0_0_15px_rgba(204,255,0,0.3)]" 
                : !isCurrentMonth ? "opacity-0 pointer-events-none" : !available ? "opacity-20 grayscale cursor-not-allowed text-zinc-500" : "text-white/80 hover:bg-primary-fixed/10 hover:text-primary-fixed",
              i === 6 && "border-r"
            )}
          >
            <span className="text-xs font-headline">{formattedDate}</span>
            {available && isCurrentMonth && !isSelected && (
              <div className="absolute bottom-1 w-1 h-1 bg-primary-fixed/40 rounded-full" />
            )}
          </button>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div className="grid grid-cols-7" key={day.toString()}>
          {days}
        </div>
      );
      days = [];
    }
    return <div className="border-b border-r border-white/5 rounded-lg overflow-hidden">{rows}</div>;
  };

  const generateTimes = () => {
    if (!settings || !selectedDate || !profile) return [];

    // 0. Check Permissions — usuários comuns = indicadores no sistema IndicaAi
    const isUser = profile.role === UserRole.USER;

    if (isUser && !settings.allowIndicatorBooking) return [];
    if (isUser && !settings.allowArtistBooking) return [];

    // 0.1 Trava de limite de sessões diárias
    const maxSessions = settings.maxSessionsPerDay || 5;
    if (bookingsOnDay >= maxSessions) return [];
    
    const times: string[] = [];
    const [startH, startM] = settings.workingHours.start.split(':').map(Number);
    const [endH, endM] = settings.workingHours.end.split(':').map(Number);
    
    const durationMinutes = settings.durations?.[size] || (size === 'Pequena' ? 60 : size === 'Média' ? 120 : 240);
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const isToday = isSameDay(selectedDate, new Date());
    const now = new Date();

    let current = new Date();
    current.setHours(startH, startM, 0, 0);
    const endTime = new Date();
    endTime.setHours(endH, endM, 0, 0);

    while (current.getTime() + durationMinutes * 60000 <= endTime.getTime()) {
      const timeStr = format(current, 'HH:mm');
      const sessionEnd = new Date(current.getTime() + durationMinutes * 60000);

      // Trava para o mesmo dia: só permite agendamento com pelo menos 60 minutos de antecedência
      if (isToday) {
        const slotDateTime = new Date(selectedDate);
        slotDateTime.setHours(current.getHours(), current.getMinutes(), 0, 0);
        if (slotDateTime.getTime() <= now.getTime() + 60 * 60 * 1000) {
          current.setMinutes(current.getMinutes() + 30);
          continue;
        }
      }

      // 1. Check against Administrative Blocks
      const isBlocked = settings.blockedIntervals?.some(block => {
        if (block.date !== dateStr) return false;
        const bStart = new Date(`2000-01-01T${block.start}`);
        const bEnd = new Date(`2000-01-01T${block.end}`);
        const sStart = new Date(`2000-01-01T${timeStr}`);
        const sEnd = new Date(`2000-01-01T${format(sessionEnd, 'HH:mm')}`);
        // Collision if: session starts before block ends AND session ends after block starts
        return sStart < bEnd && sEnd > bStart;
      });

      // 2. Check against existing approved bookings (com margem de 15min)
      const isOccupied = existingBookings.some(b => {
        if (b.status === BookingStatus.REJECTED || b.status === BookingStatus.NO_SHOW) return false;
        const bStart = new Date(`2000-01-01T${b.time}`);
        const bDuration = settings.durations?.[b.size as Size] || (b.size === 'Pequena' ? 60 : b.size === 'Média' ? 120 : 240);
        const bEnd = new Date(bStart.getTime() + (bDuration + 15) * 60000);
        
        const sStart = new Date(`2000-01-01T${timeStr}`);
        const sEnd = new Date(`2000-01-01T${format(sessionEnd, 'HH:mm')}`);
        return sStart < bEnd && sEnd > bStart;
      });

      if (!isBlocked && !isOccupied) {
        times.push(timeStr);
      }
      
      current.setMinutes(current.getMinutes() + 30); // 30min slot granularity
    }
    return times;
  };

  const isDayAvailable = (date: Date) => {
    if (!settings) return false;
    const dayOfWeek = date.getDay();
    const dateStr = format(date, 'yyyy-MM-dd');
    return settings.workingDays.includes(dayOfWeek) && !settings.blockedDates.includes(dateStr);
  };

  return (
    <div className="bg-background text-on-surface font-sans min-h-screen pb-32">
      <header className="fixed top-0 w-full z-50 flex justify-between items-center px-6 h-20 bg-zinc-950/80 backdrop-blur-xl border-b border-white/5">
        <div className="flex items-center gap-4">
          <ChevronRight className="w-6 h-6 text-primary-fixed rotate-180" onClick={() => navigate(-1)} />
          <h1 className="text-primary-fixed font-headline font-black tracking-widest text-xl uppercase">Agendar</h1>
        </div>
      </header>

      <main className="pt-24 px-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* Left Column: Step 1 & 2 */}
          <div className="space-y-10">
        {/* Step 1: Size */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="font-headline text-[10px] text-primary-fixed px-2 py-1 bg-primary-fixed/10 rounded tracking-widest border border-primary-fixed/20 uppercase">Passo 1</span>
            <h3 className="font-headline text-xl">Escolha o tamanho</h3>
          </div>
          <div className="space-y-3">
            {(Object.keys(priceEstimates) as Size[]).map((s) => (
              <button
                key={s}
                onClick={() => setSize(s)}
                className={cn(
                  "w-full glass-panel p-5 rounded-xl flex justify-between items-center transition-all duration-300 border-white/5",
                  size === s && "border-primary-fixed/40 bg-primary-fixed/5 neon-glow"
                )}
              >
                <div className="text-left">
                  <p className={cn("font-headline text-lg", size === s ? "text-primary-fixed" : "text-white")}>{s}</p>
                  <p className={cn("text-sm", size === s ? "text-primary-fixed/70" : "text-on-surface-variant")}>
                    R${priceEstimates[s].min} – R${priceEstimates[s].max}
                  </p>
                </div>
                {size === s ? (
                  <CheckCircle2 className="text-primary-fixed w-6 h-6 fill-primary-fixed/10" />
                ) : (
                  <div className="w-6 h-6 rounded-full border-2 border-zinc-800" />
                )}
              </button>
            ))}

            {/* Aviso de Estimativa */}
            <div className="p-3 bg-zinc-900/60 rounded-xl border border-white/5 flex items-start gap-3">
              <Info className="w-4 h-4 text-primary-fixed flex-shrink-0 mt-0.5" />
              <p className="text-[11px] text-zinc-400 leading-relaxed font-sans">
                <strong className="text-white">Estimativa de tempo & valor base:</strong> O valor final e a arte personalizada serão avaliados e validados diretamente pelo tatuador na confirmação do agendamento.
              </p>
            </div>

            {/* Detalhes da Ideia & Local */}
            <div className="space-y-3 pt-2">
              <label className="text-[10px] font-headline uppercase tracking-widest text-zinc-400 font-bold block">
                Região do Corpo
              </label>
              <div className="grid grid-cols-3 gap-2">
                {['Antebraço', 'Braço', 'Perna', 'Costela', 'Costas', 'Peito', 'Mão', 'Pescoço', 'Outro'].map((reg) => (
                  <button
                    key={reg}
                    type="button"
                    onClick={() => setRegiaoCorpo(reg)}
                    className={cn(
                      "py-2 px-3 rounded-lg text-xs font-headline uppercase tracking-wider transition-all border",
                      regiaoCorpo === reg
                        ? "bg-primary-fixed text-black font-black border-primary-fixed shadow-[0_0_10px_rgba(204,255,0,0.2)]"
                        : "glass-panel border-white/5 text-zinc-400 hover:text-white hover:border-white/20"
                    )}
                  >
                    {reg}
                  </button>
                ))}
              </div>

              <label className="text-[10px] font-headline uppercase tracking-widest text-zinc-400 font-bold block pt-2">
                Ideia / Descrição do desenho
              </label>
              <textarea
                value={descricaoIdeia}
                onChange={(e) => setDescricaoIdeia(e.target.value)}
                placeholder="Ex: Leão geométrico no antebraço, traço fino, aprox. 12cm..."
                rows={2}
                className="w-full bg-zinc-900/80 border border-white/10 rounded-xl p-3 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-primary-fixed/50 resize-none font-sans"
              />

              {/* Upload de Fotos de Referência */}
              <div className="space-y-2 pt-2">
                <label className="text-[10px] font-headline uppercase tracking-widest text-zinc-400 font-bold block">
                  Foto de Referência (Opcional)
                </label>
                <div className="border border-dashed border-white/15 rounded-xl p-4 text-center hover:bg-white/5 transition-colors cursor-pointer bg-zinc-900/40">
                  <input
                    type="file"
                    id="booking-foto-upload"
                    className="hidden"
                    multiple
                    accept="image/*"
                    onChange={handleUploadFoto}
                  />
                  <label htmlFor="booking-foto-upload" className="cursor-pointer flex flex-col items-center gap-2">
                    <Upload className="w-5 h-5 text-primary-fixed" />
                    <span className="text-xs text-zinc-300 font-medium">
                      {uploadingImg ? "Carregando foto..." : "Clique para anexar foto ou print da ideia"}
                    </span>
                    <span className="text-[10px] text-zinc-500">PNG, JPG até 5MB</span>
                  </label>
                </div>

                {fotosReferencia.length > 0 && (
                  <div className="flex gap-2 flex-wrap mt-2">
                    {fotosReferencia.map((url, i) => (
                      <div key={i} className="relative w-16 h-16 rounded-xl overflow-hidden border border-white/20 group shadow-md">
                        <img src={url} alt="Referência" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => handleRemoverFoto(i)}
                          className="absolute top-1 right-1 bg-black/80 text-white rounded-full p-0.5 hover:bg-red-500 transition-colors"
                          title="Remover"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Step 2: Date */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="font-headline text-[10px] text-primary-fixed px-2 py-1 bg-primary-fixed/10 rounded tracking-widest border border-primary-fixed/20 uppercase">Passo 2</span>
            <h3 className="font-headline text-xl">Escolher data</h3>
          </div>
          <div className="glass-panel p-4 rounded-xl border-white/5 overflow-hidden">
            {renderHeader()}
            {renderDays()}
            {renderCells()}
            
            {selectedDate && settings && bookingsOnDay >= settings.maxSessionsPerDay && (
              <div className="mt-4 flex items-center gap-2 text-red-400 bg-red-400/10 p-3 rounded-lg border border-red-400/20">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <p className="text-[10px] font-headline uppercase tracking-widest font-black leading-none">Agenda lotada para este dia!</p>
              </div>
            )}
          </div>
        </section>
          </div>

          {/* Right Column: Step 3 & 4 */}
          <div className="space-y-10">

        {/* Step 3: Time */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="font-headline text-[10px] text-primary-fixed px-2 py-1 bg-primary-fixed/10 rounded tracking-widest border border-primary-fixed/20 uppercase">Passo 3</span>
            <h3 className="font-headline text-xl">Escolher horário</h3>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {generateTimes().map((t) => (
              <button
                key={t}
                disabled={!selectedDate || (settings && bookingsOnDay >= settings.maxSessionsPerDay)}
                onClick={() => setSelectedTime(t)}
                className={cn(
                  "py-4 rounded-xl font-headline transition-all text-xs border uppercase tracking-widest",
                  selectedTime === t 
                    ? "bg-primary-fixed text-black font-black border-primary-fixed" 
                    : "glass-panel border-white/5 text-zinc-500 hover:border-primary-fixed/30 disabled:opacity-30"
                )}
              >
                {t}
              </button>
            ))}
            
            {settings && selectedDate && generateTimes().length === 0 && (
              <div className="col-span-3 py-8 glass-panel rounded-xl border-dashed border-white/10 flex flex-col items-center justify-center text-center px-6">
                <Ban className="w-8 h-8 text-zinc-700 mb-3" />
                <p className="text-[10px] font-headline text-zinc-500 uppercase tracking-widest leading-relaxed">
                  {(profile?.role === UserRole.USER && (!settings.allowIndicatorBooking || !settings.allowArtistBooking))
                   ? "Agendamentos temporariamente desativados pelo administrador."
                   : "Nenhum horário disponível para esta data e tamanho de tattoo."}
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Step 4: Summary */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="font-headline text-[10px] text-primary-fixed px-2 py-1 bg-primary-fixed/10 rounded tracking-widest border border-primary-fixed/20 uppercase">Passo 4</span>
            <h3 className="font-headline text-xl">Pagamento</h3>
          </div>
          <motion.div className="glass-panel p-8 rounded-2xl border border-white/5 space-y-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center text-on-surface-variant font-headline text-[10px] uppercase tracking-widest">
                <span>Valor estimado</span>
                <span className="text-white text-sm">R$ {estimatedValue}</span>
              </div>
              <div className="flex justify-between items-center text-on-surface-variant font-headline text-[10px] uppercase tracking-widest">
                <span>Saldo VIP</span>
                <span className="text-primary-fixed text-sm">R$ {creditsAvailable}</span>
              </div>
              
              <div className="flex justify-between items-center bg-primary-fixed/10 p-4 rounded-xl border border-primary-fixed/20">
                <div className="flex items-center gap-2">
                   <Zap className="w-4 h-4 text-primary-fixed fill-primary-fixed" />
                   <span className="text-primary-fixed text-xs font-headline font-black uppercase tracking-widest">Desconto Aplicado</span>
                </div>
                <span className="text-primary-fixed font-headline text-xl font-black">- R$ {maxCreditUsage}</span>
              </div>
            </div>

            <div className="bg-primary-fixed p-6 rounded-xl shadow-lg shadow-primary-fixed/10">
               <p className="text-black text-center font-headline font-black uppercase tracking-widest text-sm">Pagar sinal: R$ {depositValue}</p>
            </div>
            
            <p className="text-[10px] text-center text-zinc-500 uppercase tracking-widest font-headline font-medium leading-relaxed">
              O agendamento ficará em análise<br/>
              <span className="italic opacity-70">Aguarde aprovação para pagar o sinal.</span>
            </p>
          </motion.div>
        </section>

          </div>
        </div>

        <section className="pt-10 pb-12">
           <button 
             onClick={handleConfirm}
             disabled={loading || !selectedDate || !selectedTime || (settings && bookingsOnDay >= settings.maxSessionsPerDay)}
             className="w-full bg-primary-fixed text-black h-16 rounded-2xl font-headline font-black tracking-widest flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all shadow-xl shadow-primary-fixed/20 uppercase disabled:opacity-50"
           >
              {loading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <>
                  Solicitar Agendamento
                  <ChevronRight className="w-6 h-6" />
                </>
              )}
           </button>
        </section>
      </main>
    </div>
  );
}
