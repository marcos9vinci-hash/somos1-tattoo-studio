// @ts-nocheck
import React, { useState, useEffect, useMemo } from 'react';
import { X, UserPlus, ChevronUp, ChevronDown, Upload, FileText, Search, ArrowLeft, Check, RotateCcw, Phone, UserCheck, Loader2, CheckCircle2, Send, Calendar } from 'lucide-react';
import { db } from '../../lib/firebase';
import { collection, addDoc, getDocs, serverTimestamp, query, where, doc, updateDoc } from 'firebase/firestore';
import { cn } from '../../lib/utils';
import { BookingStatus } from '../../types';
import { whatsappService } from '../../lib/whatsappService';
import { crmService } from '../../lib/crmService';

interface NovoAgendamentoWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialDate?: Date | null;
  initialTime?: string | null;
  agendamentoParaEditar?: Booking | null;
}

export default function NovoAgendamentoWizard({
  isOpen,
  onClose,
  onSuccess,
  initialDate,
  initialTime,
  agendamentoParaEditar
}: NovoAgendamentoWizardProps) {
  const [form, setForm] = useState({
    cliente_id: '',
    profissional_id: '',
    data_agendamento: '',
    descricao_servico: '',
    valor_estimado: '',
    valor_sinal: '',
    estilo: '',
    primeira_tatuagem: false,
    regiao_corpo: '',
    fotos_referencia: [] as string[],
    // Opções de tempo para automação WhatsApp
    enviarConfirmacao: true,
    tempoConfirmacao: 'imediato', // imediato, 5min, 15min
    enviarLembrete: true,
    tempoLembreteValor: 2,
    tempoLembreteUnidade: 'hours', // minutes, hours, days
    enviarCheckIn: true,
    tempoCheckInValor: 30,
    tempoCheckInUnidade: 'minutes', // minutes, hours, days
    enviarFollowUp: true,
    tempoFollowUpValor: 2,
    tempoFollowUpUnidade: 'minutes' // minutes, hours, days
  });

  const [clientesLocais, setClientesLocais] = useState<any[]>([]);
  const [clientSearch, setClientSearch] = useState('');
  const [showNovoCliente, setShowNovoCliente] = useState(false);
  const [novoCliente, setNovoCliente] = useState({ nome: '', telefone: '', email: '', instagram: '' });
  const [criandoCliente, setCriandoCliente] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [showConfirmOrAdjustModal, setShowConfirmOrAdjustModal] = useState(false);
  const [clienteJaTatuou, setClienteJaTatuou] = useState(false);

  useEffect(() => {
    const fetchAndSetup = async () => {
      let sortedClientes: any[] = [];
      try {
        const snap = await getDocs(collection(db, 'users'));
        sortedClientes = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .sort((a: any, b: any) => (a.name || '').localeCompare(b.name || '', 'pt-BR', { sensitivity: 'base' }));
      } catch (error) {
        console.error("Erro ao buscar clientes:", error);
      }

      setClientSearch('');

      if (agendamentoParaEditar) {
        const customAuto = agendamentoParaEditar.customAutomation;
        const bUserId = agendamentoParaEditar.userId || agendamentoParaEditar.cliente_id || '';
        const bName = agendamentoParaEditar.userName || agendamentoParaEditar.clientName || agendamentoParaEditar.nome || '';
        const bPhone = agendamentoParaEditar.userPhone || agendamentoParaEditar.clientPhone || agendamentoParaEditar.telefone || '';
        const bCleanPhone = bPhone.replace(/\D/g, '');

        // Tenta achar cliente correspondente na lista
        let matched = sortedClientes.find(c => c.id === bUserId);
        if (!matched && bCleanPhone) {
          matched = sortedClientes.find(c => {
            const p = (c.phone || c.telefone || '').replace(/\D/g, '');
            return p && (p === bCleanPhone || p.endsWith(bCleanPhone) || bCleanPhone.endsWith(p));
          });
        }
        if (!matched && bName) {
          const lowerName = bName.trim().toLowerCase();
          matched = sortedClientes.find(c => (c.name || '').trim().toLowerCase() === lowerName);
        }

        let resolvedClienteId = matched?.id || bUserId;
        if (!matched) {
          // Cria registro do cliente para nunca deixar a seleção em branco
          const fallbackClient = {
            id: resolvedClienteId || `booking_client_${agendamentoParaEditar.id}`,
            name: bName || 'Cliente Estúdio',
            phone: bPhone,
            role: 'user'
          };
          resolvedClienteId = fallbackClient.id;
          sortedClientes = [fallbackClient, ...sortedClientes];
        }

        setClientesLocais(sortedClientes);

        setForm({
          cliente_id: resolvedClienteId,
          profissional_id: agendamentoParaEditar.artistId || '',
          data_agendamento: `${agendamentoParaEditar.date}T${agendamentoParaEditar.time || '10:00'}`,
          descricao_servico: agendamentoParaEditar.descricao_servico || '',
          valor_estimado: (agendamentoParaEditar.priceEstimated ?? agendamentoParaEditar.valor_estimado ?? '').toString(),
          valor_sinal: (agendamentoParaEditar.depositPaid ?? agendamentoParaEditar.valor_sinal ?? '').toString(),
          estilo: agendamentoParaEditar.estilo || '',
          primeira_tatuagem: agendamentoParaEditar.primeira_tatuagem || false,
          regiao_corpo: agendamentoParaEditar.regiao_corpo || '',
          fotos_referencia: agendamentoParaEditar.fotos_referencia || [],
          enviarConfirmacao: false,
          tempoConfirmacao: 'imediato',
          enviarLembrete: customAuto?.enviarLembrete ?? true,
          tempoLembreteValor: customAuto?.reminderValue ?? 2,
          tempoLembreteUnidade: customAuto?.reminderUnit ?? 'hours',
          enviarCheckIn: customAuto?.enviarCheckIn ?? true,
          tempoCheckInValor: customAuto?.sessionCheckInValue ?? 30,
          tempoCheckInUnidade: customAuto?.sessionCheckInUnit ?? 'minutes',
          enviarFollowUp: customAuto?.enviarFollowUp ?? true,
          tempoFollowUpValor: customAuto?.followUpValue ?? 2,
          tempoFollowUpUnidade: customAuto?.followUpUnit ?? 'minutes'
        });
      } else {
        setClientesLocais(sortedClientes);
        const dateStr = initialDate ? initialDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
        const timeStr = initialTime || '10:00';
        setForm(f => ({ ...f, data_agendamento: `${dateStr}T${timeStr}` }));
      }
    };

    if (isOpen) {
      fetchAndSetup();
    }
  }, [isOpen, initialDate, initialTime, agendamentoParaEditar]);

  const filteredClientes = useMemo(() => {
    const q = clientSearch.toLowerCase().trim();
    if (!q) return clientesLocais;
    const qDigits = q.replace(/\D/g, '');
    return clientesLocais.filter((c: any) => {
      const nameMatch = (c.name || '').toLowerCase().includes(q);
      const phoneRaw = (c.phone || c.telefone || '').replace(/\D/g, '');
      const phoneMatch = qDigits.length > 0 && phoneRaw.includes(qDigits);
      const emailMatch = (c.email || '').toLowerCase().includes(q);
      return nameMatch || phoneMatch || emailMatch;
    });
  }, [clientesLocais, clientSearch]);

  const clienteSelecionado = useMemo(() => {
    return clientesLocais.find(c => c.id === form.cliente_id) || null;
  }, [clientesLocais, form.cliente_id]);

  const handleChange = (field: string, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const dataParte = form.data_agendamento ? form.data_agendamento.slice(0, 10) : "";
  const horaParte = form.data_agendamento ? form.data_agendamento.slice(11, 16) : "";

  const handleDataChange = (novaData: string) => {
    if (!novaData) return;
    const hora = horaParte || "09:00";
    handleChange("data_agendamento", `${novaData}T${hora}`);
  };

  const handleHoraChange = (novaHora: string) => {
    if (!novaHora) return;
    const data = dataParte || new Date().toISOString().slice(0, 10);
    handleChange("data_agendamento", `${data}T${novaHora}`);
  };

  // Adaptação: Convertendo imagem para Base64 (temporário até Firebase Storage)
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
      setForm(prev => ({ ...prev, fotos_referencia: [...(prev.fotos_referencia || []), ...urls] }));
    } catch (err) {
      console.error("Erro no upload", err);
    } finally {
      setUploadingImg(false);
      e.target.value = "";
    }
  };

  const handleRemoverFoto = (idx: number) => {
    setForm(prev => ({ ...prev, fotos_referencia: prev.fotos_referencia.filter((_, i) => i !== idx) }));
  };

  const handleCriarCliente = async () => {
    if (!novoCliente.nome.trim()) return;
    setCriandoCliente(true);
    try {
      const payload = {
        name: novoCliente.nome,
        phone: novoCliente.telefone,
        email: novoCliente.email,
        instagram: novoCliente.instagram,
        role: 'user',
        createdAt: serverTimestamp(),
        creditsBalance: 0,
        tier: 'Bronze',
        inviteCode: Math.random().toString(36).substring(2, 8).toUpperCase()
      };
      const docRef = await addDoc(collection(db, 'users'), payload);
      const criado = { id: docRef.id, ...payload };
      setClientesLocais(prev => [...prev, criado]);
      setForm(prev => ({ ...prev, cliente_id: docRef.id }));
      setNovoCliente({ nome: "", telefone: "", email: "", instagram: "" });
      setShowNovoCliente(false);
    } catch (error) {
      console.error("Erro ao criar cliente:", error);
    } finally {
      setCriandoCliente(false);
    }
  };

  const temCliente = Boolean(
    form.cliente_id ||
    (agendamentoParaEditar && (agendamentoParaEditar.userName || agendamentoParaEditar.clientName || agendamentoParaEditar.userId)) ||
    novoCliente.nome.trim()
  );
  const temData = Boolean(form.data_agendamento);
  const podeSalvar = Boolean(temCliente && temData && !isLoading);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!temCliente || !temData) {
      alert("Por favor, selecione o cliente e o horário do agendamento.");
      return;
    }
    // Abre modal de escolha inteligente entre Confirmar (com Zap) vs Ajustar (sem Zap)
    setShowConfirmOrAdjustModal(true);
  };

  const handleExecuteSave = async (modo: 'confirmar' | 'ajustar', clienteJaTatuouFlag?: boolean) => {
    if (!temCliente || !temData) return;
    setIsLoading(true);
    setShowConfirmOrAdjustModal(false);

    try {
      const selectedUser = clientesLocais.find(c => c.id === form.cliente_id);
      
      const cleanValue = (val: any, fallback: any = '') => (val === undefined || val === null ? fallback : val);

      const resolvedName = cleanValue(
        selectedUser?.name || agendamentoParaEditar?.userName || agendamentoParaEditar?.clientName,
        'Cliente'
      );
      const resolvedPhone = cleanValue(
        selectedUser?.phone || selectedUser?.telefone || agendamentoParaEditar?.userPhone || agendamentoParaEditar?.clientPhone,
        ''
      );

      const payload: any = {
        userId: form.cliente_id || agendamentoParaEditar?.userId || 'cliente_avulso',
        userName: resolvedName,
        userPhone: resolvedPhone,
        artistId: cleanValue(form.profissional_id, 'admin'),
        date: dataParte,
        time: horaParte,
        priceEstimated: form.valor_estimado ? (parseFloat(form.valor_estimado) || 0) : 0,
        depositPaid: form.valor_sinal ? (parseFloat(form.valor_sinal) || 0) : 0,
        fotos_referencia: form.fotos_referencia || [],
        descricao_servico: cleanValue(form.descricao_servico, ''),
        estilo: cleanValue(form.estilo, ''),
        primeira_tatuagem: !!form.primeira_tatuagem,
        regiao_corpo: cleanValue(form.regiao_corpo, ''),
        customAutomation: {
          reminderValue: Number(form.tempoLembreteValor) || 2,
          reminderUnit: form.tempoLembreteUnidade || 'hours',
          sessionCheckInValue: Number(form.tempoCheckInValor) || 30,
          sessionCheckInUnit: form.tempoCheckInUnidade || 'minutes',
          followUpValue: Number(form.tempoFollowUpValor) || 2,
          followUpUnit: form.tempoFollowUpUnidade || 'minutes',
          enviarLembrete: form.enviarLembrete,
          enviarCheckIn: form.enviarCheckIn,
          enviarFollowUp: form.enviarFollowUp
        }
      };

      // Remove qualquer chave undefined remanescente
      Object.keys(payload).forEach(key => {
        if (payload[key] === undefined) delete payload[key];
      });

      if (agendamentoParaEditar && agendamentoParaEditar.id) {
        // Detecta se a data ou horário foram alterados
        const oldDate = agendamentoParaEditar.date;
        const oldTime = agendamentoParaEditar.time;
        const isDateTimeChanged = Boolean(
          (dataParte && oldDate && dataParte !== oldDate) ||
          (horaParte && oldTime && horaParte !== oldTime)
        );

        const updateData: any = {
          ...payload,
          updatedAt: serverTimestamp()
        };

        if (modo === 'ajustar') {
          // ================= MODO AJUSTAR (SILENCIOSO - SEM WHATSAPP) =================
          if (clienteJaTatuouFlag) {
            updateData.status = BookingStatus.COMPLETED;
          } else {
            // Mantém o status original (ex: APPROVED) sem forçar RESCHEDULED para não disparar zap
            updateData.status = agendamentoParaEditar.status || BookingStatus.APPROVED;
          }

          await updateDoc(doc(db, 'bookings', agendamentoParaEditar.id), updateData);
          await crmService.syncBookingToCRM({ ...agendamentoParaEditar, ...updateData } as any, updateData.status);

          alert(
            clienteJaTatuouFlag
              ? "✅ Horário ajustado e marcado como CONCLUÍDO na esteira (sem disparar WhatsApp ao cliente)!"
              : "✅ Horário ajustado na agenda com sucesso (sem disparar WhatsApp ao cliente)!"
          );
          onSuccess();
          onClose();
          return;
        }

        // ================= MODO CONFIRMAR (COM WHATSAPP) =================
        if (isDateTimeChanged) {
          updateData.status = BookingStatus.RESCHEDULED;
          updateData.rescheduleSent = false;
          updateData.reminderSent = false;
          updateData.followUpSent = false;
        } else {
          updateData.status = agendamentoParaEditar.status || BookingStatus.APPROVED;
        }

        await updateDoc(doc(db, 'bookings', agendamentoParaEditar.id), updateData);
        await crmService.syncBookingToCRM({ ...agendamentoParaEditar, ...updateData } as any, updateData.status);

        // Dispara mensagem no WhatsApp se houver reagendamento OU se o usuário marcou enviar confirmação
        if (selectedUser && (isDateTimeChanged || form.enviarConfirmacao)) {
          const isReschedule = isDateTimeChanged;
          whatsappService.triggerBookingLifecycle({
            id: agendamentoParaEditar.id,
            userName: selectedUser.name || 'Cliente',
            userPhone: selectedUser.phone || selectedUser.telefone || '',
            date: dataParte,
            time: horaParte,
            descricao_servico: form.descricao_servico,
            artistId: form.profissional_id,
            priceEstimated: payload.priceEstimated,
            depositPaid: payload.depositPaid
          }, isReschedule, {
            automation: {
              enabled: true,
              confirmationEnabled: true,
              reminderEnabled: form.enviarLembrete,
              reminderValue: Number(form.tempoLembreteValor) || 2,
              reminderUnit: form.tempoLembreteUnidade,
              followUpEnabled: form.enviarFollowUp,
              followUpValue: Number(form.tempoFollowUpValor) || 2,
              followUpUnit: form.tempoFollowUpUnidade,
              evolutionInstance: 'wats'
            }
          } as any).catch(err => {
            console.warn("Aviso no disparo do ciclo de automação ao editar:", err);
          });
        }

        alert(isDateTimeChanged ? "Agendamento reagendado e confirmação enviada no WhatsApp!" : "Tattoo atualizada e confirmação enviada com sucesso!");
        onSuccess();
        onClose();
        return;
      }

      // ================= NOVO AGENDAMENTO =================
      payload.size = 'Média';
      payload.creditsUsed = 0;
      payload.status = (modo === 'ajustar' && clienteJaTatuouFlag) ? BookingStatus.COMPLETED : BookingStatus.APPROVED;
      payload.createdAt = serverTimestamp();

      const docRef = await addDoc(collection(db, 'bookings'), payload);
      await crmService.syncBookingToCRM({ id: docRef.id, ...payload } as any, payload.status);

      if (modo === 'ajustar') {
        alert(
          clienteJaTatuouFlag
            ? "✅ Agendamento registrado como CONCLUÍDO na esteira (sem disparar WhatsApp ao cliente)!"
            : "✅ Agendamento registrado silenciosamente na agenda (sem disparar WhatsApp ao cliente)!"
        );
      } else {
        alert("Agendamento realizado e confirmado com sucesso!");

        if (selectedUser) {
          const dynamicSettings = {
            automation: {
              enabled: true,
              confirmationEnabled: form.enviarConfirmacao,
              reminderEnabled: form.enviarLembrete,
              reminderValue: Number(form.tempoLembreteValor) || 2,
              reminderUnit: form.tempoLembreteUnidade,
              followUpEnabled: form.enviarFollowUp,
              followUpValue: Number(form.tempoFollowUpValor) || 2,
              followUpUnit: form.tempoFollowUpUnidade,
              evolutionInstance: 'wats'
            }
          };

          const bookingData = {
            id: docRef.id,
            userName: selectedUser.name || 'Cliente',
            userPhone: selectedUser.phone || selectedUser.telefone || '',
            date: dataParte,
            time: horaParte,
            descricao_servico: form.descricao_servico,
            artistId: form.profissional_id,
            priceEstimated: payload.priceEstimated,
            depositPaid: payload.depositPaid
          };

          whatsappService.triggerBookingLifecycle(bookingData, false, dynamicSettings as any).catch(err => {
            console.warn("Aviso no disparo do ciclo de automação:", err);
          });
        }
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error("Erro ao agendar:", error);
      alert("Erro ao salvar agendamento: " + (error as any).message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col sm:items-center sm:justify-center p-0 sm:p-4 bg-black/90 backdrop-blur-md animate-in fade-in overflow-hidden">
      <div className="bg-zinc-950 border-0 sm:border sm:border-white/10 sm:rounded-2xl w-full max-w-lg shadow-2xl relative h-[100dvh] sm:h-auto sm:max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95">
        {/* HEADER FIXO NO TOPO - NUNCA CORTA NO CELULAR */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between shrink-0 bg-zinc-950 z-10 pt-safe">
          <div className="flex items-center gap-3">
            <img src="/somos1-logo-official.png" alt="Somos 1" className="w-10 h-10 object-contain rounded-xl bg-black p-1 border border-white/10 shadow-md" />
            <div>
              <h2 className="text-lg font-bold text-white uppercase font-headline tracking-wide leading-none">
                {agendamentoParaEditar ? "Editar Tattoo" : "Novo Agendamento"}
              </h2>
              <p className="text-[10px] text-primary-fixed font-headline font-bold uppercase tracking-widest mt-1">Somos 1 Tattoo Studio</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 rounded-full p-2 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          {/* CORPO DO FORMULÁRIO COM SCROLL SUAVE */}
          <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-5 scrollbar-thin">
            
            {/* SELETOR DE MODO DE CLIENTE (GRANDE E DESTACADO) */}
            <div className="grid grid-cols-2 gap-2 p-1.5 bg-zinc-900/90 border border-white/10 rounded-xl">
              <button
                type="button"
                onClick={() => setShowNovoCliente(false)}
                className={cn(
                  "py-2.5 px-3 rounded-lg text-xs font-headline font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all",
                  !showNovoCliente ? "bg-primary-fixed text-black shadow-md" : "text-zinc-400 hover:text-white"
                )}
              >
                <Search className="w-3.5 h-3.5" />
                <span>Buscar Cliente</span>
              </button>
              <button
                type="button"
                onClick={() => setShowNovoCliente(true)}
                className={cn(
                  "py-2.5 px-3 rounded-lg text-xs font-headline font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all",
                  showNovoCliente ? "bg-primary-fixed text-black shadow-md" : "text-primary-fixed hover:bg-primary-fixed/10"
                )}
              >
                <UserPlus className="w-4 h-4 stroke-[2.5]" />
                <span>+ Novo Cliente</span>
              </button>
            </div>

            {/* Cliente */}
            <div className="space-y-3">
            {showNovoCliente ? (
              /* MODO CADASTRO NOVO CLIENTE */
              <div className="border border-white/10 rounded-2xl p-4 space-y-4 bg-zinc-900/70">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <button 
                    type="button" 
                    onClick={() => setShowNovoCliente(false)}
                    className="text-xs text-zinc-400 hover:text-white flex items-center gap-1.5 transition-colors font-medium"
                  >
                    <ArrowLeft className="w-4 h-4 text-primary-fixed" />
                    Voltar para lista de clientes
                  </button>
                  <span className="text-[10px] font-headline uppercase font-black px-2.5 py-0.5 rounded-full bg-primary-fixed/10 text-primary-fixed border border-primary-fixed/20">
                    Novo Cliente
                  </span>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-zinc-400 block mb-1">Nome completo *</label>
                    <input 
                      className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-primary-fixed"
                      placeholder="Ex: João da Silva" 
                      value={novoCliente.nome} 
                      onChange={e => setNovoCliente(p => ({ ...p, nome: e.target.value }))} 
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400 block mb-1">WhatsApp (com DDD) *</label>
                    <input 
                      className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-primary-fixed"
                      placeholder="Ex: 11999998888" 
                      value={novoCliente.telefone} 
                      onChange={e => setNovoCliente(p => ({ ...p, telefone: e.target.value }))} 
                    />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400 block mb-1">Email (opcional)</label>
                    <input 
                      className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-primary-fixed"
                      placeholder="Ex: joao@email.com" 
                      value={novoCliente.email} 
                      onChange={e => setNovoCliente(p => ({ ...p, email: e.target.value }))} 
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button 
                    type="button" 
                    onClick={() => setShowNovoCliente(false)}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 text-xs font-semibold text-zinc-400 hover:text-white hover:bg-white/5 transition-all"
                  >
                    Cancelar e Voltar
                  </button>
                  <button 
                    type="button" 
                    className="flex-1 bg-primary-fixed text-black font-bold py-2.5 rounded-xl text-xs disabled:opacity-50 hover:brightness-110 transition-all flex items-center justify-center gap-2 shadow-lg"
                    onClick={handleCriarCliente} 
                    disabled={criandoCliente || !novoCliente.nome.trim()}
                  >
                    {criandoCliente ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
                    {criandoCliente ? "Cadastrando..." : "Cadastrar e Selecionar"}
                  </button>
                </div>
              </div>
            ) : clienteSelecionado ? (
              /* CLIENTE JÁ SELECIONADO (COM BOTÃO CLARO DE VOLTAR / DESMARCAR) */
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-zinc-300">Cliente Selecionado *</label>
                  <span className="text-[10px] text-green-400 flex items-center gap-1 font-bold">
                    <Check className="w-3.5 h-3.5" /> Pronto para agendar
                  </span>
                </div>

                <div className="bg-zinc-900 border border-primary-fixed/40 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-md">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-full bg-primary-fixed/20 border border-primary-fixed/40 flex items-center justify-center text-primary-fixed font-black text-sm shrink-0">
                      {clienteSelecionado.name?.slice(0, 2).toUpperCase() || 'CL'}
                    </div>
                    <div className="truncate">
                      <p className="text-base font-bold text-white truncate">
                        {clienteSelecionado.name || 'Sem nome'}
                      </p>
                      <p className="text-xs text-zinc-400 flex items-center gap-1.5 mt-0.5">
                        <Phone className="w-3 h-3 text-green-400" />
                        <span className="text-green-400/90 font-medium">
                          {clienteSelecionado.phone || clienteSelecionado.telefone || 'Sem WhatsApp'}
                        </span>
                        {clienteSelecionado.email && (
                          <>
                            <span className="text-zinc-600">•</span>
                            <span className="text-zinc-400 truncate max-w-[140px]">{clienteSelecionado.email}</span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      handleChange("cliente_id", "");
                      setClientSearch("");
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs font-bold transition-all shrink-0 hover:scale-105 active:scale-95"
                    title="Clique para desmarcar e escolher outro cliente"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Trocar Cliente
                  </button>
                </div>
              </div>
            ) : (
              /* MODO BUSCA E SELEÇÃO DE CLIENTE */
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-zinc-300">Cliente *</label>
                  <button 
                    type="button" 
                    className="text-xs text-primary-fixed hover:text-primary-fixed/80 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary-fixed/10 border border-primary-fixed/20 font-semibold transition-all hover:bg-primary-fixed/20"
                    onClick={() => setShowNovoCliente(true)}
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    + Novo Cliente
                  </button>
                </div>
                
                {/* Barra de Pesquisa */}
                <div className="relative">
                  <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Pesquisar por nome ou WhatsApp (Ex: Marcos ou 119578)..."
                    value={clientSearch}
                    onChange={e => setClientSearch(e.target.value)}
                    className="w-full bg-zinc-900 border border-white/15 rounded-xl pl-10 pr-9 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-primary-fixed focus:ring-1 focus:ring-primary-fixed transition-all"
                  />
                  {clientSearch && (
                    <button
                      type="button"
                      onClick={() => setClientSearch("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-1 rounded-full transition-colors"
                      title="Limpar busca"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Lista de Clientes em Cards Clicáveis */}
                <div className="border border-white/10 rounded-xl bg-zinc-900/60 max-h-52 overflow-y-auto divide-y divide-white/5 shadow-inner">
                  {filteredClientes.length > 0 ? (
                    filteredClientes.map(c => {
                      const phoneFormatted = c.phone || c.telefone || '';
                      return (
                        <div
                          key={c.id}
                          onClick={() => {
                            handleChange("cliente_id", c.id);
                            setClientSearch("");
                          }}
                          className="p-3 hover:bg-white/5 cursor-pointer flex items-center justify-between transition-colors group"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-zinc-800 group-hover:bg-primary-fixed/20 group-hover:text-primary-fixed border border-white/10 flex items-center justify-center text-xs font-bold text-zinc-300 transition-colors shrink-0">
                              {c.name?.slice(0, 2).toUpperCase() || 'CL'}
                            </div>
                            <div className="truncate">
                              <p className="text-sm font-semibold text-white group-hover:text-primary-fixed transition-colors truncate">
                                {c.name || 'Sem nome'}
                              </p>
                              <p className="text-xs text-zinc-400 flex items-center gap-1.5">
                                {phoneFormatted ? (
                                  <span className="text-zinc-300">📱 {phoneFormatted}</span>
                                ) : (
                                  <span className="text-zinc-600">Sem WhatsApp</span>
                                )}
                              </p>
                            </div>
                          </div>
                          <span className="text-[11px] font-semibold text-zinc-400 group-hover:text-white group-hover:bg-primary-fixed/20 group-hover:border-primary-fixed/30 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 shrink-0 ml-2 transition-all">
                            Selecionar →
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-4 text-center space-y-2">
                      <p className="text-xs text-zinc-400">
                        Nenhum cliente encontrado para <strong className="text-white">"{clientSearch}"</strong>
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          const digits = clientSearch.replace(/\D/g, '');
                          setNovoCliente(p => ({
                            ...p,
                            nome: digits.length < 8 ? clientSearch : p.nome,
                            telefone: digits.length >= 8 ? clientSearch : p.telefone
                          }));
                          setShowNovoCliente(true);
                        }}
                        className="text-xs text-primary-fixed hover:underline font-semibold block mx-auto"
                      >
                        + Cadastrar "{clientSearch}" como novo cliente
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Data e Hora */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-zinc-300">Data *</label>
              <input 
                type="date" 
                onClick={(e) => { try { e.currentTarget.showPicker(); } catch {} }}
                className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary-fixed cursor-pointer font-mono"
                value={dataParte} 
                onChange={e => handleDataChange(e.target.value)} 
                required 
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-zinc-300">Hora *</label>
              <input 
                type="time" 
                onClick={(e) => { try { e.currentTarget.showPicker(); } catch {} }}
                className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary-fixed cursor-pointer font-mono"
                value={horaParte} 
                onChange={e => handleHoraChange(e.target.value)} 
                required 
              />
            </div>
          </div>

          {/* Serviço / Descrição */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-zinc-300">Descrição da Tatuagem</label>
            <textarea 
              className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-primary-fixed min-h-[80px]"
              placeholder="Ex: Leão realista no antebraço..."
              value={form.descricao_servico} 
              onChange={e => handleChange("descricao_servico", e.target.value)} 
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-zinc-300">Região do Corpo</label>
              <input 
                className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary-fixed"
                placeholder="Ex: Antebraço direito"
                value={form.regiao_corpo} 
                onChange={e => handleChange("regiao_corpo", e.target.value)} 
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-zinc-300">Estilo</label>
              <input 
                className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary-fixed"
                placeholder="Ex: Realismo, Fineline"
                value={form.estilo} 
                onChange={e => handleChange("estilo", e.target.value)} 
              />
            </div>
          </div>

          {/* Valores */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-zinc-300">Valor Estimado (R$)</label>
              <input 
                type="number" 
                className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary-fixed"
                placeholder="0.00"
                value={form.valor_estimado} 
                onChange={e => handleChange("valor_estimado", e.target.value)} 
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-zinc-300">Valor Sinal (R$)</label>
              <input 
                type="number" 
                className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary-fixed"
                placeholder="0.00"
                value={form.valor_sinal} 
                onChange={e => handleChange("valor_sinal", e.target.value)} 
              />
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer mt-2">
            <input 
              type="checkbox" 
              className="accent-primary-fixed w-4 h-4 rounded"
              checked={form.primeira_tatuagem} 
              onChange={e => handleChange("primeira_tatuagem", e.target.checked)} 
            />
            <span className="text-sm text-zinc-300">É a primeira tatuagem do cliente?</span>
          </label>

          {/* Fotos de Referência */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-zinc-300">Fotos de Referência</label>
            <div className="border-2 border-dashed border-white/10 rounded-xl p-4 text-center hover:bg-zinc-900/50 transition-colors">
              <input 
                type="file" 
                id="foto-upload" 
                className="hidden" 
                multiple 
                accept="image/*" 
                onChange={handleUploadFoto} 
              />
              <label htmlFor="foto-upload" className="cursor-pointer flex flex-col items-center gap-2">
                <Upload className="w-6 h-6 text-zinc-500" />
                <span className="text-sm text-zinc-400">
                  {uploadingImg ? "Processando imagens..." : "Clique para adicionar fotos"}
                </span>
              </label>
            </div>
            
            {form.fotos_referencia.length > 0 && (
              <div className="flex gap-2 flex-wrap mt-3">
                {form.fotos_referencia.map((url, i) => (
                  <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-white/10 group">
                    <img src={url} alt="ref" className="w-full h-full object-cover" />
                    <button 
                      type="button" 
                      onClick={() => handleRemoverFoto(i)}
                      className="absolute inset-0 bg-red-500/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-4 h-4 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* CONFIGURAÇÃO DE TEMPOS DE WHATSAPP (Confirmação, Lembrete, Follow-up) */}
          <div className="bg-zinc-900/80 border border-primary-fixed/20 rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <div className="flex items-center gap-2">
                <span className="text-base">💬</span>
                <span className="text-xs font-bold text-white uppercase font-headline tracking-wider">Disparos WhatsApp Automáticos</span>
              </div>
              <span className="text-[10px] text-primary-fixed bg-primary-fixed/10 px-2 py-0.5 rounded-full font-bold">Evolution Ativa</span>
            </div>

            {/* 1. Confirmação */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    className="accent-primary-fixed w-3.5 h-3.5 rounded"
                    checked={form.enviarConfirmacao}
                    onChange={e => handleChange('enviarConfirmacao', e.target.checked)}
                  />
                  <span>1. Confirmação do Agendamento</span>
                </label>
                <span className="text-[11px] text-zinc-400">Tempo:</span>
              </div>
              {form.enviarConfirmacao && (
                <div className="grid grid-cols-2 gap-2 pl-5">
                  <select
                    className="w-full bg-zinc-950 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-primary-fixed"
                    value={form.tempoConfirmacao}
                    onChange={e => handleChange('tempoConfirmacao', e.target.value)}
                  >
                    <option value="imediato">⚡ Imediato (ao salvar)</option>
                    <option value="5min">⏱️ Após 5 minutos</option>
                    <option value="15min">⏱️ Após 15 minutos</option>
                  </select>
                  <p className="text-[10px] text-zinc-500 flex items-center">Dispara no zap com dados da tattoo</p>
                </div>
              )}
            </div>

            {/* 2. Lembrete Pré-Sessão */}
            <div className="space-y-1.5 border-t border-white/5 pt-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    className="accent-primary-fixed w-3.5 h-3.5 rounded"
                    checked={form.enviarLembrete}
                    onChange={e => handleChange('enviarLembrete', e.target.checked)}
                  />
                  <span>2. Lembrete de Sessão</span>
                </label>
                <span className="text-[11px] text-zinc-400">Antecedência:</span>
              </div>
              {form.enviarLembrete && (
                <div className="grid grid-cols-2 gap-2 pl-5">
                  <input
                    type="number"
                    min="1"
                    className="w-full bg-zinc-950 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-primary-fixed"
                    value={form.tempoLembreteValor}
                    onChange={e => handleChange('tempoLembreteValor', e.target.value)}
                  />
                  <select
                    className="w-full bg-zinc-950 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-primary-fixed"
                    value={form.tempoLembreteUnidade}
                    onChange={e => handleChange('tempoLembreteUnidade', e.target.value)}
                  >
                    <option value="minutes">Minutos antes</option>
                    <option value="hours">Horas antes</option>
                    <option value="days">Dias antes</option>
                  </select>
                </div>
              )}
            </div>

            {/* 3. Check-in de Conclusão (Miguel ↔ Tatuador) */}
            <div className="space-y-1.5 border-t border-white/5 pt-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    className="accent-primary-fixed w-3.5 h-3.5 rounded"
                    checked={form.enviarCheckIn}
                    onChange={e => handleChange('enviarCheckIn', e.target.checked)}
                  />
                  <span className="text-emerald-400 font-bold">3. Check-in de Conclusão (Miguel ↔ Tatuador)</span>
                </label>
                <span className="text-[11px] text-zinc-400">Tempo:</span>
              </div>
              {form.enviarCheckIn && (
                <div className="space-y-1.5 pl-5">
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      min="1"
                      className="w-full bg-zinc-950 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-primary-fixed"
                      value={form.tempoCheckInValor}
                      onChange={e => handleChange('tempoCheckInValor', e.target.value)}
                    />
                    <select
                      className="w-full bg-zinc-950 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-primary-fixed"
                      value={form.tempoCheckInUnidade}
                      onChange={e => handleChange('tempoCheckInUnidade', e.target.value)}
                    >
                      <option value="minutes">Minutos após</option>
                      <option value="hours">Horas após</option>
                      <option value="days">Dias após</option>
                    </select>
                  </div>
                  <p className="text-[10px] text-zinc-500">
                    O Miguel chamará você no zap para confirmar se o cliente compareceu antes de liberar os cuidados pós-venda.
                  </p>
                </div>
              )}
            </div>

            {/* 4. Follow-up Pós-Tattoo (Cicatrização) */}
            <div className="space-y-1.5 border-t border-white/5 pt-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    className="accent-primary-fixed w-3.5 h-3.5 rounded"
                    checked={form.enviarFollowUp}
                    onChange={e => handleChange('enviarFollowUp', e.target.checked)}
                  />
                  <span>4. Follow-up Cicatrização (Cliente)</span>
                </label>
                <span className="text-[11px] text-zinc-400">Após sessão:</span>
              </div>
              {form.enviarFollowUp && (
                <div className="grid grid-cols-2 gap-2 pl-5">
                  <input
                    type="number"
                    min="1"
                    className="w-full bg-zinc-950 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-primary-fixed"
                    value={form.tempoFollowUpValor}
                    onChange={e => handleChange('tempoFollowUpValor', e.target.value)}
                  />
                  <select
                    className="w-full bg-zinc-950 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-primary-fixed"
                    value={form.tempoFollowUpUnidade}
                    onChange={e => handleChange('tempoFollowUpUnidade', e.target.value)}
                  >
                    <option value="minutes">Minutos depois</option>
                    <option value="hours">Horas depois</option>
                    <option value="days">Dias depois</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          </div>

          {/* FOOTER FIXO COM BOTÕES DE AÇÃO: AJUSTAR (SEM ZAP) OU CONFIRMAR (COM ZAP) */}
          <div className="p-4 sm:p-5 border-t border-white/10 shrink-0 bg-zinc-950/95 backdrop-blur-sm z-10 flex flex-col sm:flex-row gap-2.5">
            <button 
              type="button"
              onClick={() => {
                if (!podeSalvar) {
                  alert("Por favor, selecione o cliente e a data/horário do agendamento.");
                  return;
                }
                setShowConfirmOrAdjustModal(true);
              }}
              className="flex-1 bg-zinc-900 border border-amber-500/40 hover:bg-amber-500/10 text-amber-300 font-headline font-bold py-3.5 px-3 rounded-xl uppercase tracking-wider text-xs transition-all flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
              disabled={!podeSalvar}
              title="Ajustar agenda internamente sem disparar WhatsApp ao cliente"
            >
              <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Apenas Ajustar Agenda (Sem Zap)</span>
            </button>

            <button 
              type="submit" 
              className="flex-1 bg-primary-fixed text-black font-headline font-black py-3.5 px-3 rounded-xl uppercase tracking-wider text-xs disabled:opacity-50 hover:bg-primary-fixed/90 transition-all shadow-lg shadow-primary-fixed/20 active:scale-98 flex items-center justify-center gap-2"
              disabled={!podeSalvar}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 shrink-0" />
                  <span>{agendamentoParaEditar ? "Confirmar / Ajustar" : "Confirmar Agendamento"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* MODAL INTELIGENTE DE DECISÃO: CONFIRMAR (ZAP) OU AJUSTAR (SILENCIOSO) */}
      {showConfirmOrAdjustModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in">
          <div className="bg-zinc-950 border border-white/10 rounded-2xl w-full max-w-md p-5 sm:p-6 shadow-2xl space-y-5 animate-in zoom-in-95 relative">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
                <Calendar className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-headline font-bold text-white text-base uppercase leading-snug">
                  Como deseja salvar este horário?
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Cliente: <strong className="text-white">{clientesLocais.find(c => c.id === form.cliente_id)?.name || 'Cliente'}</strong>
                  <br />
                  Data: <span className="text-amber-400 font-bold">{dataParte ? dataParte.split('-').reverse().join('/') : ''}</span> às <span className="text-amber-400 font-bold">{horaParte}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowConfirmOrAdjustModal(false)}
                className="text-zinc-500 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              {/* OPÇÃO 1: APENAS AJUSTAR AGENDA (SILENCIOSO / CLIENTE JÁ TATUOU) */}
              <div className="p-4 rounded-xl border border-amber-500/40 bg-amber-500/[0.08] hover:bg-amber-500/[0.12] transition-all space-y-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 shrink-0 mt-0.5">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-headline font-bold text-amber-300 text-xs uppercase tracking-wide">
                        📝 Apenas Ajustar Agenda
                      </span>
                      <span className="text-[9px] bg-amber-500/20 text-amber-400 font-bold px-2 py-0.5 rounded-full border border-amber-500/30">
                        Silencioso (Sem Zap)
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-300 mt-1 leading-relaxed">
                      Atualiza a agenda interna <strong>sem enviar nada no WhatsApp</strong> do cliente. Ideal para ajustes internos ou quando você esqueceu de marcar na hora.
                    </p>
                  </div>
                </div>

                {/* Opção se o cliente já tatuou */}
                <div className="pt-2.5 border-t border-amber-500/20 flex items-center gap-2.5 bg-black/40 p-2.5 rounded-lg">
                  <input
                    type="checkbox"
                    id="clienteJaTatuouCheck"
                    checked={clienteJaTatuou}
                    onChange={(e) => setClienteJaTatuou(e.target.checked)}
                    className="w-4 h-4 rounded accent-emerald-500 cursor-pointer"
                  />
                  <label 
                    htmlFor="clienteJaTatuouCheck" 
                    className="text-xs text-zinc-200 font-medium cursor-pointer select-none"
                  >
                    Cliente já fez a tattoo? (Marcar como <strong className="text-emerald-400">🟢 Concluído / Trabalho Realizado</strong>)
                  </label>
                </div>

                <button
                  type="button"
                  onClick={() => handleExecuteSave('ajustar', clienteJaTatuou)}
                  disabled={isLoading}
                  className="w-full py-2.5 bg-amber-500 text-black font-headline font-black text-xs uppercase tracking-wider rounded-lg hover:bg-amber-400 transition-all shadow-md active:scale-98 flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Confirmar Apenas Ajuste (Sem WhatsApp)</span>
                </button>
              </div>

              {/* OPÇÃO 2: CONFIRMAR E AVISAR NO WHATSAPP */}
              <div className="p-4 rounded-xl border border-sky-500/30 bg-sky-500/[0.06] hover:bg-sky-500/[0.10] transition-all space-y-2.5">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-sky-500/20 text-sky-400 shrink-0 mt-0.5">
                    <Send className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-headline font-bold text-white text-xs uppercase tracking-wide">
                        📱 Confirmar & Notificar no WhatsApp
                      </span>
                      <span className="text-[9px] bg-sky-500/20 text-sky-400 font-bold px-2 py-0.5 rounded-full border border-sky-500/30">
                        Dispara Zap
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                      Salva o horário e dispara notificação automática no WhatsApp do cliente avisando do agendamento ou nova data/hora.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleExecuteSave('confirmar', false)}
                  disabled={isLoading}
                  className="w-full py-2.5 bg-sky-500 text-white font-headline font-black text-xs uppercase tracking-wider rounded-lg hover:bg-sky-400 transition-all shadow-md active:scale-98 flex items-center justify-center gap-1.5"
                >
                  <Send className="w-4 h-4" />
                  <span>Salvar & Enviar Mensagem no Zap</span>
                </button>
              </div>
            </div>

            <div className="pt-1 text-center">
              <button
                type="button"
                onClick={() => setShowConfirmOrAdjustModal(false)}
                className="text-xs text-zinc-400 hover:text-white font-headline uppercase tracking-wider transition-colors py-1"
              >
                Voltar e continuar editando
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
