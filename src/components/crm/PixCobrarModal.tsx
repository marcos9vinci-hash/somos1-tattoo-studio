import React, { useState, useEffect } from 'react';
import { 
  X, 
  QrCode, 
  Copy, 
  Check, 
  Send, 
  Sparkles, 
  CheckCircle2, 
  Wallet, 
  Building2, 
  RefreshCw,
  Coins,
  Smartphone,
  ExternalLink
} from 'lucide-react';
import { 
  generatePixCopiaECola, 
  getPixQrCodeImageUrl, 
  buildPixWhatsAppMessage 
} from '../../lib/pixQrCodeService';
import { Lead } from '../../types/crm';
import { crmService } from '../../lib/crmService';
import { addContaReceber } from '../../lib/financeService';

interface PixCobrarModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead?: Lead | null;
  // Valores padrão opcionais se acionado fora de um Lead
  defaultValor?: number;
  defaultClienteNome?: string;
  defaultTelefone?: string;
  defaultDescricao?: string;
  onConfirmedPayment?: (valor: number) => void;
}

export const PixCobrarModal: React.FC<PixCobrarModalProps> = ({
  isOpen,
  onClose,
  lead,
  defaultValor = 150,
  defaultClienteNome = 'Cliente',
  defaultTelefone = '',
  defaultDescricao = 'Atendimento Tattoo',
  onConfirmedPayment
}) => {
  const [chavePix, setChavePix] = useState('somos1tattoo@gmail.com');
  const [nomeRecebedor, setNomeRecebedor] = useState('SOMOS 1 TATTOO');
  const [cidade, setCidade] = useState('SAO PAULO');
  
  const clienteNome = lead?.nome || defaultClienteNome;
  const clienteTelefone = lead?.telefone || defaultTelefone;
  const descricaoServico = lead?.ideiaProjeto || defaultDescricao;

  // Cálculo de valores recomendados
  const valorTotalTattoo = lead?.spin?.ticketEstimado || lead?.orcamentoMaximo || (lead as any)?.priceEstimated || defaultValor;
  const valorSinal30 = Math.round(valorTotalTattoo * 0.3) || 100;
  const valorRestante = Math.max(0, valorTotalTattoo - (lead?.valorSinal || 0));

  const [valorCobrado, setValorCobrado] = useState<number>(() => {
    if (lead?.estagio === 'pos_venda' || lead?.estagio === 'agendado') {
      return valorRestante > 0 ? valorRestante : valorTotalTattoo;
    }
    return valorSinal30;
  });

  const [copiado, setCopiado] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Atualiza o valor ao abrir modal para um lead específico
  useEffect(() => {
    if (isOpen) {
      if (lead) {
        if (lead.estagio === 'negociacao') {
          setValorCobrado(lead.valorSinal || valorSinal30);
        } else if (lead.estagio === 'pos_venda' || lead.estagio === 'agendado') {
          setValorCobrado(valorRestante > 0 ? valorRestante : valorTotalTattoo);
        } else {
          setValorCobrado(valorSinal30);
        }
      } else {
        setValorCobrado(defaultValor);
      }
      setCopiado(false);
    }
  }, [isOpen, lead]);

  if (!isOpen) return null;

  // Gera payload do Banco Central
  const copiaECola = generatePixCopiaECola({
    chave: chavePix,
    nomeRecebedor,
    cidade,
    valor: valorCobrado,
    descricao: descricaoServico.slice(0, 30)
  });

  const qrCodeUrl = getPixQrCodeImageUrl(copiaECola, 360);

  const handleCopiarCodigo = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(copiaECola).then(() => {
        setCopiado(true);
        setTimeout(() => setCopiado(false), 3000);
      }).catch(() => {
        prompt('Copie o código PIX Copia e Cola abaixo:', copiaECola);
      });
    } else {
      prompt('Copie o código PIX Copia e Cola abaixo:', copiaECola);
    }
  };

  const handleEnviarWhatsApp = () => {
    const texto = buildPixWhatsAppMessage({
      clienteNome,
      descricaoServico,
      valor: valorCobrado,
      copiaECola
    });

    const cleanPhone = clienteTelefone.replace(/\D/g, '');
    const phoneWithDDI = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    
    if (cleanPhone) {
      const url = `https://wa.me/${phoneWithDDI}?text=${encodeURIComponent(texto)}`;
      window.open(url, '_blank');
    } else {
      handleCopiarCodigo();
      alert(`⚠️ Cliente sem telefone cadastrado.\n\nO código PIX foi copiado para sua área de transferência para colar no WhatsApp.`);
    }
  };

  const handleConfirmarRecebimento = async () => {
    if (!window.confirm(`Confirmar o recebimento de R$ ${valorCobrado.toFixed(2)} de ${clienteNome} e lançar no Caixa?`)) {
      return;
    }

    setIsSubmitting(true);
    try {
      if (lead) {
        // Se for na etapa de negociação, confirma o sinal
        if (lead.estagio === 'negociacao') {
          await crmService.updateLead(lead.id, {
            sinalPago: true,
            valorSinal: valorCobrado,
            estagio: 'agendado'
          });
        }

        // Lança no financeiro
        await addContaReceber({
          cliente: lead.nome,
          clienteTelefone: lead.telefone,
          descricao: `PIX Recebido: ${lead.ideiaProjeto || 'Tatuagem'}`,
          valor: valorTotalTattoo || valorCobrado,
          valorSinal: valorCobrado,
          vencimento: new Date().toISOString().split('T')[0],
          dataPgto: new Date().toISOString().split('T')[0],
          formaPgto: 'pix',
          status: 'pago',
          artistaNome: 'Markinhos Tatuador',
          obs: `Recebimento via QR Code PIX Presencial/WhatsApp (${chavePix})`
        });
      } else {
        await addContaReceber({
          cliente: clienteNome,
          clienteTelefone,
          descricao: `PIX Recebido: ${descricaoServico}`,
          valor: valorCobrado,
          valorSinal: valorCobrado,
          vencimento: new Date().toISOString().split('T')[0],
          dataPgto: new Date().toISOString().split('T')[0],
          formaPgto: 'pix',
          status: 'pago',
          artistaNome: 'Markinhos Tatuador',
          obs: `Recebimento via QR Code PIX no balcão`
        });
      }

      if (onConfirmedPayment) {
        onConfirmedPayment(valorCobrado);
      }

      alert(`✅ Pagamento de R$ ${valorCobrado.toFixed(2)} confirmado e registrado no Caixa!`);
      onClose();
    } catch (err) {
      console.error('Erro ao dar baixa:', err);
      alert('Erro ao confirmar pagamento.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div 
        className="relative w-full max-w-lg bg-zinc-950 border border-purple-500/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="px-6 py-4 border-b border-purple-500/20 bg-gradient-to-r from-purple-950/50 via-zinc-900 to-zinc-950 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/20 border border-purple-400/30 text-purple-300">
              <QrCode className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2 font-headline">
                Cobrar com QR Code PIX
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 uppercase tracking-wider font-mono">
                  Banco Central Oficial
                </span>
              </h3>
              <p className="text-xs text-zinc-400">
                Cliente: <span className="text-purple-300 font-semibold">{clienteNome}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo */}
        <div className="p-6 overflow-y-auto space-y-5 custom-scrollbar">
          {/* Seletor de Valor */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
              <span>Valor da Cobrança:</span>
              <span className="text-amber-400 font-bold font-headline">
                R$ {valorCobrado.toFixed(2).replace('.', ',')}
              </span>
            </label>

            {/* Atalhos Rápidos */}
            <div className="grid grid-cols-3 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setValorCobrado(valorSinal30)}
                className={`py-1.5 px-2 rounded-xl border font-bold transition-all ${
                  valorCobrado === valorSinal30 
                    ? 'bg-purple-600/30 border-purple-400 text-purple-200' 
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Sinal (R$ {valorSinal30})
              </button>
              {valorRestante > 0 && (
                <button
                  type="button"
                  onClick={() => setValorCobrado(valorRestante)}
                  className={`py-1.5 px-2 rounded-xl border font-bold transition-all ${
                    valorCobrado === valorRestante 
                      ? 'bg-purple-600/30 border-purple-400 text-purple-200' 
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Restante (R$ {valorRestante})
                </button>
              )}
              <button
                type="button"
                onClick={() => setValorCobrado(valorTotalTattoo)}
                className={`py-1.5 px-2 rounded-xl border font-bold transition-all ${
                  valorCobrado === valorTotalTattoo 
                    ? 'bg-purple-600/30 border-purple-400 text-purple-200' 
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Total (R$ {valorTotalTattoo})
              </button>
            </div>

            {/* Input customizado */}
            <div className="relative mt-2">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 font-bold text-xs">R$</span>
              <input
                type="number"
                step="0.01"
                value={valorCobrado}
                onChange={(e) => setValorCobrado(Math.max(1, parseFloat(e.target.value) || 0))}
                className="w-full pl-9 pr-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-white font-headline font-bold text-sm outline-none focus:border-purple-500"
                placeholder="Digitar outro valor..."
              />
            </div>
          </div>

          {/* Área do QR Code com moldura e instrução */}
          <div className="bg-gradient-to-b from-zinc-900 to-zinc-950 border border-purple-500/20 rounded-2xl p-5 flex flex-col items-center justify-center text-center shadow-inner relative group">
            <div className="bg-white p-3.5 rounded-2xl shadow-xl shadow-purple-950/50 border-2 border-purple-400/40">
              <img
                src={qrCodeUrl}
                alt="QR Code PIX"
                className="w-52 h-52 object-contain rounded-lg"
              />
            </div>

            <div className="mt-3.5 space-y-1">
              <div className="text-xl font-black text-emerald-400 font-headline">
                R$ {valorCobrado.toFixed(2).replace('.', ',')}
              </div>
              <p className="text-[11px] text-zinc-400 flex items-center justify-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-purple-400" />
                O cliente aponta a câmera de qualquer banco (Nubank, Itaú, Inter...)
              </p>
            </div>
          </div>

          {/* Botões de Ação para Copiar ou Enviar */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={handleCopiarCodigo}
              className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold font-headline flex items-center justify-center gap-2 transition-all border ${
                copiado
                  ? 'bg-emerald-600/30 border-emerald-400 text-emerald-300'
                  : 'bg-zinc-900 hover:bg-zinc-800/80 border-zinc-700/80 text-zinc-200'
              }`}
            >
              {copiado ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  Código PIX Copiado com Sucesso!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-purple-400" />
                  Copiar Código PIX (Copia e Cola)
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleEnviarWhatsApp}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold font-headline flex items-center justify-center gap-2 transition-all active:scale-98"
            >
              <Send className="w-4 h-4 text-emerald-400" />
              Enviar Chave e Código no WhatsApp do Cliente
            </button>
          </div>
        </div>

        {/* Rodapé / Confirmação do Recebimento */}
        <div className="px-6 py-4 border-t border-purple-500/20 bg-zinc-950 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
          >
            Fechar
          </button>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleConfirmarRecebimento}
            className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-900/30 flex items-center gap-2 active:scale-95 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Registrando...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                Cliente Já Pagou! (Lançar no Caixa)
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
