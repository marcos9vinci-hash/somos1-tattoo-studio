import React, { useState } from 'react';
import { StudioSettings } from '../../types';
import { 
  MessageSquare, 
  CheckCircle2, 
  Copy, 
  Eye, 
  Smartphone, 
  Tag, 
  Sparkles, 
  Calendar, 
  Clock, 
  User, 
  Scissors, 
  Gift, 
  RotateCcw, 
  AlertCircle,
  Layers
} from 'lucide-react';
import { toast } from '../../lib/toast';

interface Props {
  settings: StudioSettings;
  setSettings: React.Dispatch<React.SetStateAction<StudioSettings>>;
  handleUpdateSettings: (e: React.FormEvent) => Promise<void>;
}

export const WhatsAppTemplatesModule: React.FC<Props> = ({
  settings,
  setSettings,
  handleUpdateSettings
}) => {
  const [activeTemplateTab, setActiveTemplateTab] = useState<string>('confirmacao');
  const [showSimulator, setShowSimulator] = useState<boolean>(true);

  const defaultTemplates: { [key: string]: { title: string; desc: string; defaultText: string; tags: string[] } } = {
    confirmacao: {
      title: '1. Confirmação de Agendamento',
      desc: 'Enviada instantaneamente assim que o horário é registrado no estúdio.',
      tags: ['{cliente}', '{data}', '{horario}', '{servico}', '{profissional}'],
      defaultText: `Olá, {cliente}! 🖤 Tudo bem?
Seu agendamento no Somos 1 Tattoo Studio está CONFIRMADO! ✨

📅 Data: {data}
⏰ Horário: {horario}
🎨 Serviço: {servico}
✍️ Profissional: {profissional}

📍 Endereço: Somos 1 Tattoo Studio
Dúvidas ou imprevistos? Responda a esta mensagem. Te esperamos! 🚀`
    },
    reagendamento: {
      title: '2. Reagendamento de Horário',
      desc: 'Disparada quando a data ou horário da sessão é modificado pela equipe ou cliente.',
      tags: ['{cliente}', '{data}', '{horario}', '{profissional}'],
      defaultText: `Oi, {cliente}! 🔄
Seu agendamento foi REAGENDADO com sucesso!

📅 Nova Data: {data}
⏰ Novo Horário: {horario}
✍️ Artista: {profissional}

Caso precise de qualquer outro ajuste, só nos avisar por aqui. Até logo! ✨`
    },
    cancelamento: {
      title: '3. Cancelamento de Sessão',
      desc: 'Enviada quando um agendamento é desmarcado.',
      tags: ['{cliente}', '{data}', '{horario}'],
      defaultText: `Olá, {cliente}. ⚠️
Confirmamos o cancelamento da sua sessão agendada para {data} às {horario}.

Sentiremos sua falta! Quando quiser remarcar ou escolher uma nova data, basta nos chamar aqui ou acessar nosso app. 🖤`
    },
    lembrete: {
      title: '4. Lembrete de Sessão',
      desc: 'Disparado automaticamente com antecedência para evitar faltas e atrasos.',
      tags: ['{cliente}', '{data}', '{horario}'],
      defaultText: `E aí, {cliente}! Passando para lembrar da sua sessão de tattoo amanhã! ⏰

📅 Data: {data}
⏰ Horário: {horario}
📍 Estúdio: Somos 1 Tattoo Studio

💡 Dicas de ouro:
- Durma bem e alimente-se antes da sessão
- Evite álcool 24h antes
- Venha com roupa confortável

Estamos te esperando! 🤘🔥`
    },
    followup: {
      title: '5. Follow-up de Cicatrização',
      desc: 'Enviada dias após o procedimento para acompanhar os cuidados do cliente.',
      tags: ['{cliente}'],
      defaultText: `Oi {cliente}! 🖤 Tudo bem com a cicatrização da sua nova arte?
Passando para saber como você está se sentindo e se tem seguido os cuidados recomendados (higienização e pomada cicatrizante).

Qualquer dúvida ou caso queira nos mandar uma foto de como está ficando, estamos à disposição aqui! Abraços da equipe Somos 1! ✨`
    },
    aniversario: {
      title: '6. Feliz Aniversário & Presente',
      desc: 'Enviada no aniversário do cliente com um cupom ou condição exclusiva.',
      tags: ['{cliente}', '{cupom}'],
      defaultText: `🎉 Parabéns pelo seu dia, {cliente}! 🎂✨
A equipe do Somos 1 Tattoo Studio te deseja um novo ciclo incrível, cheio de realizações e muita arte!

🎁 Preparamos um presente especial para você: use o cupom {cupom} e ganhe 15% OFF na sua próxima tattoo este mês! Bora rabiscar? 🤘🖤`
    },
    reativacao: {
      title: '7. Reativação de Cliente Ausente',
      desc: 'Disparada para clientes sem sessões recentes para trazê-los de volta.',
      tags: ['{cliente}', '{cupom}'],
      defaultText: `Oi {cliente}! 🖤 Saudades de rabiscar por aqui!
Já faz um tempo que não nos vemos no estúdio e estamos com projetos e horários novos abertos.

Queremos te ver de novo: aproveite este cupom exclusivo {cupom} para marcar seu próximo projeto com a gente! Bora agendar? 🚀`
    },
    retorno: {
      title: '8. Retoque & Cuidados Pós-Tattoo',
      desc: 'Aviso sobre a janela de avaliação de retoque gratuito após 30 dias.',
      tags: ['{cliente}'],
      defaultText: `Olá, {cliente}! ✨
Já faz 30 dias desde a sua sessão! Esse é o momento ideal para avaliarmos a cicatrização da sua tattoo e checar se há necessidade de algum retoque.

Se notar algum pontinho que precisa de ajuste, nos envie uma foto nítida aqui para agendarmos seu retoque! 🖤`
    },
    lista_espera: {
      title: '9. Alerta de Vaga / Lista de Espera',
      desc: 'Disparada para a lista quando um horário fica disponível por desistência.',
      tags: ['{cliente}', '{data}', '{horario}'],
      defaultText: `⚡ Olá {cliente}! Uma vaga de tattoo acabou de abrir na nossa agenda!
📅 Data: {data}
⏰ Horário: {horario}

Como você estava na nossa lista de espera, você tem prioridade! Se desejar aproveitar esse horário, responda "QUERO" agora antes que seja preenchido. 🖤🔥`
    }
  };

  const templates = settings.whatsappTemplates || {};

  const getTemplateValue = (key: string) => {
    return (templates as any)[key] ?? defaultTemplates[key]?.defaultText ?? '';
  };

  const updateTemplate = (key: string, val: string) => {
    setSettings(prev => ({
      ...prev,
      whatsappTemplates: {
        ...(prev.whatsappTemplates || {}),
        [key]: val
      }
    }));
  };

  const insertTag = (key: string, tag: string) => {
    const current = getTemplateValue(key);
    updateTemplate(key, current + ' ' + tag);
    toast.success(`Variável ${tag} inserida!`);
  };

  const currentTemplate = defaultTemplates[activeTemplateTab];
  const currentText = getTemplateValue(activeTemplateTab);

  // Renderiza prévia simulada com dados reais
  const simulatedText = currentText
    .replace(/{cliente}/g, 'Lucas Silva')
    .replace(/{data}/g, '25/10/2026')
    .replace(/{horario}/g, '14:30')
    .replace(/{servico}/g, 'Tatuagem Blackwork')
    .replace(/{profissional}/g, 'Markinhos')
    .replace(/{cupom}/g, 'SOMOS1VIP');

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-headline font-bold uppercase tracking-wider mb-2">
              <MessageSquare className="w-3.5 h-3.5" />
              Templates Personalizados
            </div>
            <h2 className="text-xl md:text-2xl font-headline font-black text-foreground">
              Modelos de Mensagem do WhatsApp
            </h2>
            <p className="text-xs md:text-sm text-muted-foreground mt-1">
              Personalize o texto de cada uma das 9 mensagens enviadas automaticamente aos seus clientes.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowSimulator(!showSimulator)}
              className="px-4 py-2.5 rounded-xl border border-border bg-card hover:bg-muted text-xs font-headline font-bold text-foreground transition-all flex items-center gap-2 shadow-xs"
            >
              <Smartphone className="w-4 h-4 text-emerald-500" />
              {showSimulator ? 'Ocultar Simulador' : 'Ver Simulador'}
            </button>
            <button
              type="button"
              onClick={handleUpdateSettings}
              className="px-5 py-2.5 rounded-xl bg-foreground text-background hover:opacity-90 text-xs font-headline font-black uppercase tracking-wider transition-all flex items-center gap-2 shadow-sm"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Salvar Modelos
            </button>
          </div>
        </div>
      </div>

      {/* Grid: Menu de Modelos à Esquerda + Editor e Simulador à Direita */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Lista Lateral de Modelos */}
        <div className="lg:col-span-4 bg-card border border-border rounded-2xl p-3 shadow-xs space-y-1">
          <p className="text-[10px] font-headline font-black uppercase tracking-widest text-muted-foreground px-3 py-2">
            9 Modelos de Mensagem
          </p>
          {Object.entries(defaultTemplates).map(([key, item]) => {
            const isActive = activeTemplateTab === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setActiveTemplateTab(key)}
                className={`w-full text-left px-3.5 py-3 rounded-xl transition-all flex items-center justify-between gap-2 ${
                  isActive
                    ? 'bg-foreground text-background shadow-xs font-black'
                    : 'text-foreground hover:bg-muted/60 font-medium'
                }`}
              >
                <div className="truncate">
                  <p className="text-xs font-headline font-bold truncate leading-snug">
                    {item.title}
                  </p>
                  <p className={`text-[10px] truncate ${isActive ? 'text-background/80' : 'text-muted-foreground'}`}>
                    {item.desc}
                  </p>
                </div>
                {isActive && <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />}
              </button>
            );
          })}
        </div>

        {/* Editor Central + Simulador WhatsApp */}
        <div className="lg:col-span-8 space-y-6">
          {/* Card do Editor */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-headline font-black text-foreground">
                  {currentTemplate.title}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {currentTemplate.desc}
                </p>
              </div>
              <button
                type="button"
                onClick={() => updateTemplate(activeTemplateTab, currentTemplate.defaultText)}
                className="text-[11px] font-bold text-muted-foreground hover:text-foreground underline decoration-dotted self-start sm:self-auto"
              >
                Restaurar texto padrão
              </button>
            </div>

            {/* Chips de Inserção de Variáveis */}
            <div>
              <label className="text-[11px] font-headline font-bold text-muted-foreground block mb-1.5 flex items-center gap-1.5">
                <Tag className="w-3 h-3 text-emerald-500" />
                Clique para inserir variáveis dinâmicas no texto:
              </label>
              <div className="flex flex-wrap gap-1.5">
                {currentTemplate.tags.map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => insertTag(activeTemplateTab, tag)}
                    className="px-2.5 py-1 rounded-lg bg-muted/60 hover:bg-muted text-foreground text-[11px] font-mono font-bold border border-border/80 transition-colors flex items-center gap-1"
                  >
                    <span className="text-emerald-500">+</span> {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Textarea do Modelo */}
            <div>
              <textarea
                value={currentText}
                onChange={(e) => updateTemplate(activeTemplateTab, e.target.value)}
                rows={9}
                className="w-full text-xs font-sans p-4 rounded-xl border border-border bg-card text-foreground focus:ring-2 focus:ring-emerald-500/20 leading-relaxed transition-all shadow-inner"
                placeholder="Escreva a mensagem aqui..."
              />
              <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-1 px-1">
                <span>{currentText.length} caracteres</span>
                <span>Quebras de linha e emojis são preservados</span>
              </div>
            </div>
          </div>

          {/* Simulador Visual do WhatsApp (Visual de Conversa Real) */}
          {showSimulator && (
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-emerald-500" />
                  <h4 className="text-xs font-headline font-black uppercase tracking-wider text-foreground">
                    Prévia em Tempo Real (Visão do Cliente no WhatsApp)
                  </h4>
                </div>
                <span className="text-[10px] text-muted-foreground font-mono">
                  Dados de exemplo aplicados
                </span>
              </div>

              {/* Chat WhatsApp Frame */}
              <div className="rounded-2xl border border-emerald-900/20 bg-[#efeae2] dark:bg-[#0b141a] p-4 max-w-md mx-auto shadow-inner">
                {/* Header do Chat */}
                <div className="flex items-center gap-2.5 pb-3 border-b border-black/10 dark:border-white/10 mb-4">
                  <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white text-xs font-bold">
                    S1
                  </div>
                  <div>
                    <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                      Somos 1 Tattoo Studio
                    </p>
                    <p className="text-[10px] text-zinc-600 dark:text-zinc-400">
                      Online
                    </p>
                  </div>
                </div>

                {/* Balão de Mensagem */}
                <div className="flex justify-start">
                  <div className="bg-white dark:bg-[#202c33] text-zinc-900 dark:text-zinc-100 rounded-2xl rounded-tl-xs p-3.5 shadow-xs max-w-[90%] space-y-1 relative">
                    <p className="text-xs font-sans whitespace-pre-wrap leading-relaxed select-text">
                      {simulatedText}
                    </p>
                    <div className="flex items-center justify-end gap-1 text-[9px] text-zinc-400 dark:text-zinc-500 pt-1">
                      <span>14:32</span>
                      <span className="text-emerald-500 font-bold">✓✓</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
