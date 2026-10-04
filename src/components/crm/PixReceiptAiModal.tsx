import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Upload, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Coins, 
  Calendar, 
  Building2, 
  User, 
  ShieldCheck, 
  RefreshCw,
  FileImage,
  ArrowRight,
  ClipboardPaste
} from 'lucide-react';
import { analyzeReceiptImage, analyzeReceiptText, ReceiptAnalysisResult } from '../../services/receiptAnalyzerService';
import { Lead } from '../../types/crm';
import { crmService } from '../../lib/crmService';
import { addContaReceber } from '../../lib/financeService';

interface PixReceiptAiModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead?: Lead | null;
  onSuccess?: (analysis: ReceiptAnalysisResult) => void;
  // Callback opcional se chamado dentro do Financeiro para auto-preencher formulário
  onApplyToFinance?: (analysis: ReceiptAnalysisResult) => void;
}

export const PixReceiptAiModal: React.FC<PixReceiptAiModalProps> = ({
  isOpen,
  onClose,
  lead,
  onSuccess,
  onApplyToFinance
}) => {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>('image/jpeg');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<ReceiptAnalysisResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Escuta evento de Colar (Ctrl + V) enquanto o modal estiver aberto
  useEffect(() => {
    if (!isOpen) return;

    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            handleFileSelect(file);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isOpen]);

  // Reset ao fechar ou reabrir
  useEffect(() => {
    if (!isOpen) {
      setImagePreview(null);
      setAnalysis(null);
      setErrorMessage(null);
      setIsAnalyzing(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione um arquivo de imagem válido (PNG, JPG, WEBP).');
      return;
    }

    setMimeType(file.type);
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setImagePreview(base64);
      runAiAnalysis(base64, file.type);
    };
    reader.readAsDataURL(file);
  };

  const runAiAnalysis = async (base64: string, mime: string) => {
    setIsAnalyzing(true);
    setErrorMessage(null);
    setAnalysis(null);

    try {
      const result = await analyzeReceiptImage(base64, mime);
      if (result.sucesso && result.valor > 0) {
        setAnalysis(result);
      } else {
        setErrorMessage(result.erro || 'Não foi possível detectar o valor no comprovante. Verifique a imagem.');
      }
    } catch (err: any) {
      console.error('Erro na análise do comprovante:', err);
      setErrorMessage(err.message || 'Erro ao processar imagem com a IA.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleConfirmSinalLead = async () => {
    if (!analysis) return;
    setIsSubmitting(true);

    try {
      // 1. Se estiver vinculado a um lead, atualiza o sinal no CRM
      if (lead) {
        await crmService.updateLead(lead.id, {
          sinalPago: true,
          valorSinal: analysis.valor,
          estagio: 'agendado'
        });

        // 2. Registra o sinal automaticamente no Caixa do Financeiro
        const valorTotal = lead.spin?.ticketEstimado || lead.orcamentoMaximo || (lead as any).priceEstimated || analysis.valor;
        await addContaReceber({
          cliente: lead.nome,
          clienteTelefone: lead.telefone,
          descricao: `Sinal PIX: ${lead.ideiaProjeto || 'Tatuagem'}`,
          valor: valorTotal,
          valorSinal: analysis.valor,
          vencimento: analysis.data || new Date().toISOString().split('T')[0],
          dataPgto: analysis.data || new Date().toISOString().split('T')[0],
          formaPgto: 'pix',
          status: 'sinal_pago',
          artistaNome: 'Markinhos Tatuador',
          obs: `Autenticação PIX: ${analysis.idTransacao || 'N/A'} | Banco: ${analysis.banco || 'PIX'}`
        });
      }

      // 3. Callback se chamado externamente
      if (onSuccess) {
        onSuccess(analysis);
      }

      onClose();
    } catch (err) {
      console.error('Erro ao salvar sinal:', err);
      alert('Erro ao registrar sinal.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApplyFinanceiro = () => {
    if (!analysis) return;
    if (onApplyToFinance) {
      onApplyToFinance(analysis);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div 
        className="relative w-full max-w-2xl bg-zinc-950 border border-purple-500/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="px-6 py-4 border-b border-purple-500/20 bg-gradient-to-r from-purple-950/40 via-zinc-900 to-zinc-950 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/20 border border-purple-400/30 text-purple-300">
              <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Scanner Inteligente de Comprovante PIX
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-400/30 uppercase tracking-wider font-mono">
                  Gemini Vision
                </span>
              </h3>
              <p className="text-xs text-zinc-400">
                {lead ? `Confirmar sinal para: ${lead.nome}` : 'Extração automática de valor, banco e autenticação'}
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
          {/* Área de Upload / Colar */}
          {!imagePreview ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files?.[0];
                if (file) handleFileSelect(file);
              }}
              className="group border-2 border-dashed border-purple-500/30 hover:border-purple-400/60 rounded-xl p-8 text-center cursor-pointer transition-all bg-purple-950/10 hover:bg-purple-950/20 flex flex-col items-center justify-center gap-3"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file);
                }}
              />
              <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Upload className="w-7 h-7 text-purple-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-200">
                  Clique para selecionar ou arraste o print do comprovante
                </p>
                <p className="text-xs text-zinc-400 mt-1 flex items-center justify-center gap-1.5">
                  <ClipboardPaste className="w-3.5 h-3.5 text-amber-400" />
                  Dica: Você também pode simplesmente pressionar <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 font-mono text-[10px] text-zinc-200">Ctrl + V</kbd> para colar direto!
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Preview e Status */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Visualizador da Imagem com efeito Scanner */}
                <div className="relative rounded-xl border border-zinc-800 bg-zinc-900/60 overflow-hidden flex items-center justify-center min-h-[220px] max-h-[260px]">
                  <img
                    src={imagePreview}
                    alt="Comprovante"
                    className="max-h-[260px] w-auto object-contain"
                  />
                  {isAnalyzing && (
                    <div className="absolute inset-0 bg-purple-950/40 backdrop-blur-[1px] flex flex-col items-center justify-center gap-3">
                      <div className="w-10 h-10 border-3 border-purple-500 border-t-transparent rounded-full animate-spin" />
                      <span className="text-xs font-semibold text-purple-200 animate-pulse flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        Lendo dados com Inteligência Artificial...
                      </span>
                      {/* Linha laser de scan */}
                      <div className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-purple-400 to-transparent animate-bounce" />
                    </div>
                  )}
                  <button
                    onClick={() => {
                      setImagePreview(null);
                      setAnalysis(null);
                      setErrorMessage(null);
                    }}
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/70 hover:bg-black text-zinc-300 hover:text-white transition-all text-xs flex items-center gap-1 border border-zinc-700"
                  >
                    <RefreshCw className="w-3 h-3" /> Trocar Print
                  </button>
                </div>

                {/* Painel de Resultados Extraídos */}
                <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-4 flex flex-col justify-between">
                  {isAnalyzing ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-4 space-y-2">
                      <Sparkles className="w-8 h-8 text-purple-400 animate-spin" />
                      <p className="text-xs text-zinc-400">Identificando instituição, chave PIX, pagador e valor...</p>
                    </div>
                  ) : analysis ? (
                    <div className="space-y-3">
                      {/* Destaque do Valor */}
                      <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-500/30 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">
                            Valor Validado
                          </span>
                          <div className="text-2xl font-black text-emerald-300">
                            {analysis.valorFormatado}
                          </div>
                        </div>
                        <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                          <CheckCircle2 className="w-6 h-6" />
                        </div>
                      </div>

                      {/* Informações Estruturadas */}
                      <div className="space-y-1.5 text-xs">
                        <div className="flex items-center justify-between py-1 border-b border-zinc-800">
                          <span className="text-zinc-400 flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-purple-400" /> Pagador:
                          </span>
                          <span className="font-semibold text-zinc-200 truncate max-w-[180px]">
                            {analysis.pagador || (lead ? lead.nome : 'Não identificado')}
                          </span>
                        </div>

                        <div className="flex items-center justify-between py-1 border-b border-zinc-800">
                          <span className="text-zinc-400 flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-blue-400" /> Banco / App:
                          </span>
                          <span className="font-semibold text-blue-300">
                            {analysis.banco || 'PIX'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between py-1 border-b border-zinc-800">
                          <span className="text-zinc-400 flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-amber-400" /> Data:
                          </span>
                          <span className="font-mono text-zinc-300">
                            {analysis.data.split('-').reverse().join('/')} {analysis.hora ? `às ${analysis.hora}` : ''}
                          </span>
                        </div>

                        {analysis.idTransacao && (
                          <div className="py-1">
                            <span className="text-zinc-400 flex items-center gap-1 text-[11px]">
                              <ShieldCheck className="w-3 h-3 text-emerald-400" /> Código E2E / Autenticação:
                            </span>
                            <span className="font-mono text-[10px] text-zinc-400 break-all block bg-zinc-950 p-1.5 rounded mt-0.5 border border-zinc-800/80">
                              {analysis.idTransacao}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : errorMessage ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-4 space-y-2">
                      <AlertCircle className="w-8 h-8 text-rose-400" />
                      <p className="text-xs text-rose-300 font-medium">{errorMessage}</p>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="mt-2 text-xs text-purple-400 underline hover:text-purple-300"
                      >
                        Tentar outra imagem
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Rodapé / Ações */}
        <div className="px-6 py-4 border-t border-purple-500/20 bg-zinc-950 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
          >
            Cancelar
          </button>

          <div className="flex items-center gap-2">
            {onApplyToFinance && analysis && (
              <button
                type="button"
                onClick={handleApplyFinanceiro}
                className="px-4 py-2 bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-400/40 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                Preencher no Lançamento
              </button>
            )}

            {lead && analysis && (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirmSinalLead}
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
                    Confirmar Sinal & Lançar no Caixa ({analysis.valorFormatado})
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
