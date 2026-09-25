import React, { useState } from 'react';
import { 
  Bot, Sparkles, MessageSquare, Instagram, Smartphone, Send, 
  CheckCircle2, Plus, X, Shield, Zap, AlertCircle, Heart,
  MessageCircle, Share2, Bookmark, Flame, ExternalLink, RefreshCw, Sliders
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function RoboSocialInstagram() {
  // Master Switch
  const [enabled, setEnabled] = useState(true);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Canais
  const [channels, setChannels] = useState({
    feedComments: true,
    storyReplies: true,
    storyMentions: true,
    directMessages: true
  });

  // Gatilho
  const [detectionMode, setDetectionMode] = useState<'ai' | 'keywords'>('ai');
  const [keywords, setKeywords] = useState<string[]>([
    'preço', 'valor', 'quanto', 'orçamento', 'agenda', 'flash', 'tatuar', 'marcar'
  ]);
  const [newKeyword, setNewKeyword] = useState('');

  // Resposta Pública no Feed
  const [publicReplyEnabled, setPublicReplyEnabled] = useState(true);
  const [publicReplies, setPublicReplies] = useState<string[]>([
    'Te mandamos todos os detalhes no Direct! 🚀 Dá uma olhada lá',
    'Fala @cliente! Te chamei no privado pra gente trocar uma ideia 🖤',
    'Informações e valores enviados no seu Direct! ✨'
  ]);
  const [newPublicReply, setNewPublicReply] = useState('');

  // Chamada Privada (DM)
  const [privateMessage, setPrivateMessage] = useState(
    'Fala {nome}! Vi que você curtiu nossa arte no Somos 1 Tattoo Studio 🤘\n\nPara te passar uma estimativa exata de valor e tempo, me conta: qual tamanho aproximado (em cm) e em qual parte do corpo você quer fazer?\n\nSe já quiser ver horários livres ou simular agora, clica aqui no nosso App:'
  );
  const [ctaText, setCtaText] = useState('👉 Agendar Sessão no Super App');
  const [ctaUrl, setCtaUrl] = useState('https://somos1-tattoo-studio.vercel.app/booking');
  const [includeMedia, setIncludeMedia] = useState(true);

  // Instruções da IA (Persona & Prompt)
  const [personaTone, setPersonaTone] = useState<'descontraido' | 'premium' | 'conversao'>('descontraido');
  const [aiInstructions, setAiInstructions] = useState(
`Você é o Assistente Virtual Oficial do Somos 1 Tattoo Studio. Seu tom é amigável, autêntico, descolado e parceiro do cliente, falando a linguagem do universo da tatuagem com energia positiva.

DIRETRIZES FUNDAMENTAIS:
1. NUNCA passe preço fechado de tatuagem sem saber o tamanho em centímetros e a parte do corpo do cliente.
2. Quando o cliente tiver uma ideia, incentive a mandar referências no chat ou agendar uma avaliação presencial no estúdio.
3. SEMPRE que houver interesse em agendamento ou orçamento, forneça o link oficial do nosso Super App: https://somos1-tattoo-studio.vercel.app/booking
4. Endereço e Estúdio: Nosso estúdio conta com ambiente climatizado, café, chopp gelado e biossegurança hospitalar nível máximo.
5. Cuidados pós-tattoo: Sabonete neutro nos primeiros 15 dias, pomada cicatrizante 3x ao dia em camada fina, nada de sol, praia, piscina ou arrancar casquinhas.
6. Transbordo Humano: Se o cliente pedir para falar com o tatuador ou falar sobre retoques/reclamações, responda calorosamente: "Vou avisar nossa equipe agora para te responder por aqui!" e encerre.`
  );
  const [humanHandover, setHumanHandover] = useState(true);

  // Simulador do Celular (Visual State)
  const [simulatorTab, setSimulatorTab] = useState<'feed' | 'dm' | 'story'>('feed');
  const [simulatedCustomerText, setSimulatedCustomerText] = useState('Qual o valor dessa tattoo da foto? Tem horário no sábado?');
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulatedAiReply, setSimulatedAiReply] = useState<string | null>(null);

  const handleAddKeyword = () => {
    if (newKeyword.trim() && !keywords.includes(newKeyword.trim().toLowerCase())) {
      setKeywords([...keywords, newKeyword.trim().toLowerCase()]);
      setNewKeyword('');
    }
  };

  const handleRemoveKeyword = (kw: string) => {
    setKeywords(keywords.filter(k => k !== kw));
  };

  const handleAddPublicReply = () => {
    if (newPublicReply.trim()) {
      setPublicReplies([...publicReplies, newPublicReply.trim()]);
      setNewPublicReply('');
    }
  };

  const handleRemovePublicReply = (idx: number) => {
    setPublicReplies(publicReplies.filter((_, i) => i !== idx));
  };

  const applyTonePreset = (tone: 'descontraido' | 'premium' | 'conversao') => {
    setPersonaTone(tone);
    if (tone === 'descontraido') {
      setAiInstructions(
`Você é o Assistente Virtual do Somos 1 Tattoo Studio.
Tom: Descontraído, acolhedor, estilo tatuador parceiro. Usa termos da cultura tattoo sem exageros.
- Regra de Preço: Peça tamanho em cm e local do corpo antes de dar estimativa.
- Agendamento: Sempre convide para ver a agenda no Super App: https://somos1-tattoo-studio.vercel.app/booking
- Dúvidas: Responda sobre dor, cicatrização com leveza e autoridade.`
      );
    } else if (tone === 'premium') {
      setAiInstructions(
`Você é o Concierge Oficial do Somos 1 Tattoo Studio.
Tom: Sofisticado, polido, exclusivo e focado na experiência de arte autoral personalizada.
- Atendimento: Trate cada cliente de forma única, destacando a biossegurança e o portfólio dos artistas.
- Valores: Valores são discutidos mediante análise do projeto autoral.
- Link: Convide para agendamento privativo: https://somos1-tattoo-studio.vercel.app/booking`
      );
    } else if (tone === 'conversao') {
      setAiInstructions(
`Você é o Consultor de Vendas e Agendamentos do Somos 1 Tattoo Studio.
Tom: Rápido, direto ao ponto, carismático e focado em tirar dúvidas e fechar a sessão.
- Objetivo: Responder a dúvida objetivamente e encaminhar imediatamente para o link de agendamento.
- Urgência Saudável: Destaque que a agenda do final de semana costuma lotar rápido.
- Link: https://somos1-tattoo-studio.vercel.app/booking`
      );
    }
  };

  const handleSave = () => {
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleRunSimulation = () => {
    setIsSimulating(true);
    setSimulatedAiReply(null);
    setTimeout(() => {
      setIsSimulating(false);
      if (personaTone === 'premium') {
        setSimulatedAiReply(
          `Olá! Que excelente escolha, essa peça autoral é um destaque do nosso estúdio ✨ Para elaborarmos seu projeto exclusivo e estimarmos os detalhes, você gostaria de simular agora no nosso app? ${ctaUrl}`
        );
      } else if (personaTone === 'conversao') {
        setSimulatedAiReply(
          `Fala! Essa tattoo ficou insana 🔥 O valor depende do tamanho e local, mas temos poucas vagas pra esse sábado. Clica aqui e já garante seu horário direto no app: ${ctaUrl}`
        );
      } else {
        setSimulatedAiReply(
          `E aí, beleza? Essa peça ficou animal demais! 🤘 O valor exato vai depender de quantos centímetros você quer fazer. Já manda o tamanho aqui ou confere a agenda de sábado no app: ${ctaUrl}`
        );
      }
    }, 700);
  };

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-300 pb-12">
      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-card border border-border shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-foreground text-background flex items-center justify-center shrink-0 shadow-sm">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-headline font-black text-base uppercase tracking-wider text-foreground">
                Robô Social & Automações Instagram
              </h2>
              <Badge variant="outline" className="text-[10px] uppercase font-bold border-foreground/30 text-foreground">
                Meta Graph API v21
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground font-headline mt-0.5">
              Respostas com IA nos Comentários, Stories, Menções e Direct do @somos1tattoo
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border bg-muted/40">
            <span className="text-xs font-headline font-bold text-foreground">Status do Robô:</span>
            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${enabled ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
              {enabled ? 'ATIVO NO AR' : 'PAUSADO'}
            </span>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>

          <Button 
            onClick={handleSave}
            className="h-10 rounded-xl px-5 bg-foreground text-background hover:opacity-90 font-headline font-bold text-xs uppercase tracking-wider shadow-sm gap-2"
          >
            {savedSuccess ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                <span>Salvo!</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                <span>Salvar Regras</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Main Grid: Left Controls (60%) | Right Live Phone Simulator (40%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: Controls & Prompt */}
        <div className="lg:col-span-7 space-y-5">
          <Tabs defaultValue="cerebro" className="w-full">
            <TabsList className="grid grid-cols-4 bg-muted/60 p-1 rounded-xl border border-border">
              <TabsTrigger value="cerebro" className="text-[11px] font-headline font-bold uppercase data-[state=active]:bg-foreground data-[state=active]:text-background">
                🧠 Cérebro IA
              </TabsTrigger>
              <TabsTrigger value="canais" className="text-[11px] font-headline font-bold uppercase data-[state=active]:bg-foreground data-[state=active]:text-background">
                ⚡ Canais & Gatilhos
              </TabsTrigger>
              <TabsTrigger value="feed" className="text-[11px] font-headline font-bold uppercase data-[state=active]:bg-foreground data-[state=active]:text-background">
                💬 Comentários
              </TabsTrigger>
              <TabsTrigger value="direct" className="text-[11px] font-headline font-bold uppercase data-[state=active]:bg-foreground data-[state=active]:text-background">
                📥 Direct & DM
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: CÉREBRO IA (PERSONA & PROMPT) */}
            <TabsContent value="cerebro" className="space-y-4 pt-3">
              <Card className="border-border bg-card">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-border pb-3">
                    <div>
                      <h3 className="font-headline font-black text-sm uppercase tracking-wider text-foreground flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-400" />
                        Instruções do Agente de IA (Prompt do Sistema)
                      </h3>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Define como o Gemini pensará e falará ao responder clientes nos canais sociais.
                      </p>
                    </div>
                  </div>

                  {/* Presets de Tom de Voz */}
                  <div className="space-y-2">
                    <label className="text-xs font-headline font-bold uppercase tracking-wider text-foreground">
                      Tom de Voz (Presets de 1 Clique):
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => applyTonePreset('descontraido')}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          personaTone === 'descontraido' 
                            ? 'bg-foreground text-background border-foreground font-black shadow-xs' 
                            : 'bg-card border-border text-foreground hover:bg-muted/40'
                        }`}
                      >
                        <div className="text-xs font-headline uppercase font-bold flex items-center gap-1.5">
                          🤘 Descontraído
                        </div>
                        <p className={`text-[10px] mt-1 ${personaTone === 'descontraido' ? 'opacity-80' : 'text-muted-foreground'}`}>
                          Tatuador parceiro, autoral e comunicativo.
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => applyTonePreset('premium')}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          personaTone === 'premium' 
                            ? 'bg-foreground text-background border-foreground font-black shadow-xs' 
                            : 'bg-card border-border text-foreground hover:bg-muted/40'
                        }`}
                      >
                        <div className="text-xs font-headline uppercase font-bold flex items-center gap-1.5">
                          ✨ VIP & Autoral
                        </div>
                        <p className={`text-[10px] mt-1 ${personaTone === 'premium' ? 'opacity-80' : 'text-muted-foreground'}`}>
                          Exclusivo, focado em arte e experiência única.
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => applyTonePreset('conversao')}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          personaTone === 'conversao' 
                            ? 'bg-foreground text-background border-foreground font-black shadow-xs' 
                            : 'bg-card border-border text-foreground hover:bg-muted/40'
                        }`}
                      >
                        <div className="text-xs font-headline uppercase font-bold flex items-center gap-1.5">
                          🎯 Foco em Vendas
                        </div>
                        <p className={`text-[10px] mt-1 ${personaTone === 'conversao' ? 'opacity-80' : 'text-muted-foreground'}`}>
                          Rápido, tira dúvidas e fecha o agendamento.
                        </p>
                      </button>
                    </div>
                  </div>

                  {/* Campo de Instruções da IA */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-headline font-bold uppercase tracking-wider text-foreground">
                        Diretrizes de Comportamento & Regras do Estúdio:
                      </label>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {aiInstructions.length} caracteres
                      </span>
                    </div>
                    <Textarea 
                      rows={8}
                      value={aiInstructions}
                      onChange={(e) => setAiInstructions(e.target.value)}
                      className="font-mono text-xs bg-muted/30 border-border text-foreground leading-relaxed rounded-xl"
                      placeholder="Instruções para o agente de IA..."
                    />
                    <p className="text-[10px] text-muted-foreground">
                      💡 A IA consultará essas regras antes de cada disparo de mensagem para garantir que nunca desobedeça os preços ou políticas do estúdio.
                    </p>
                  </div>

                  {/* Transbordo Humano */}
                  <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/20">
                    <div className="space-y-0.5">
                      <div className="text-xs font-headline font-bold text-foreground flex items-center gap-1.5">
                        <Shield className="w-3.5 h-3.5 text-blue-400" />
                        Transbordo Automático para Tatuador Humano
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        Pausa a IA e avisa a recepção se o cliente solicitar atendimento humano ou fizer reclamações.
                      </p>
                    </div>
                    <Switch checked={humanHandover} onCheckedChange={setHumanHandover} />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 2: CANAIS & GATILHOS */}
            <TabsContent value="canais" className="space-y-4 pt-3">
              <Card className="border-border bg-card">
                <CardContent className="p-5 space-y-4">
                  <h3 className="font-headline font-black text-sm uppercase tracking-wider text-foreground border-b border-border pb-3">
                    Canais Habilitados para a IA
                  </h3>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/20">
                      <div>
                        <div className="text-xs font-headline font-bold text-foreground">💬 Comentários em Posts & Reels</div>
                        <p className="text-[10px] text-muted-foreground">Responde publicamente no post e chama no Direct privado.</p>
                      </div>
                      <Switch 
                        checked={channels.feedComments} 
                        onCheckedChange={(v) => setChannels({ ...channels, feedComments: v })} 
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/20">
                      <div>
                        <div className="text-xs font-headline font-bold text-foreground">📸 Respostas aos Stories (Story Replies)</div>
                        <p className="text-[10px] text-muted-foreground">Quando o cliente responde a um Story com texto ou emoji.</p>
                      </div>
                      <Switch 
                        checked={channels.storyReplies} 
                        onCheckedChange={(v) => setChannels({ ...channels, storyReplies: v })} 
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/20">
                      <div>
                        <div className="text-xs font-headline font-bold text-foreground">🏷️ Menções nos Stories (Story Mentions)</div>
                        <p className="text-[10px] text-muted-foreground">Quando o cliente posta a tattoo nova e marca o @somos1tattoo.</p>
                      </div>
                      <Switch 
                        checked={channels.storyMentions} 
                        onCheckedChange={(v) => setChannels({ ...channels, storyMentions: v })} 
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/20">
                      <div>
                        <div className="text-xs font-headline font-bold text-foreground">📥 Mensagens Diretas (DMs / Direct)</div>
                        <p className="text-[10px] text-muted-foreground">Atendimento contínuo dentro da caixa de entrada privada.</p>
                      </div>
                      <Switch 
                        checked={channels.directMessages} 
                        onCheckedChange={(v) => setChannels({ ...channels, directMessages: v })} 
                      />
                    </div>
                  </div>

                  <div className="border-t border-border pt-4 space-y-3">
                    <label className="text-xs font-headline font-bold uppercase tracking-wider text-foreground">
                      Modo de Detecção de Interesse:
                    </label>

                    <div className="grid grid-cols-2 gap-3">
                      <div 
                        onClick={() => setDetectionMode('ai')}
                        className={`p-3 rounded-xl border cursor-pointer transition-all ${
                          detectionMode === 'ai' 
                            ? 'bg-foreground text-background border-foreground font-black' 
                            : 'bg-card border-border hover:bg-muted/30 text-foreground'
                        }`}
                      >
                        <div className="text-xs font-headline uppercase font-bold flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Cérebro IA (Gemini)
                        </div>
                        <p className={`text-[10px] mt-1 ${detectionMode === 'ai' ? 'opacity-80' : 'text-muted-foreground'}`}>
                          Lê e compreende qualquer comentário com inteligência sem precisar de palavras exatas.
                        </p>
                      </div>

                      <div 
                        onClick={() => setDetectionMode('keywords')}
                        className={`p-3 rounded-xl border cursor-pointer transition-all ${
                          detectionMode === 'keywords' 
                            ? 'bg-foreground text-background border-foreground font-black' 
                            : 'bg-card border-border hover:bg-muted/30 text-foreground'
                        }`}
                      >
                        <div className="text-xs font-headline uppercase font-bold flex items-center gap-1.5">
                          <Sliders className="w-3.5 h-3.5" /> Palavras-Chave Fixas
                        </div>
                        <p className={`text-[10px] mt-1 ${detectionMode === 'keywords' ? 'opacity-80' : 'text-muted-foreground'}`}>
                          Ativa apenas quando o cliente digita termos específicos pré-cadastrados.
                        </p>
                      </div>
                    </div>

                    {detectionMode === 'keywords' && (
                      <div className="space-y-2 pt-2 animate-in fade-in">
                        <div className="flex gap-2">
                          <Input 
                            value={newKeyword}
                            onChange={(e) => setNewKeyword(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddKeyword()}
                            placeholder="Adicionar palavra-chave (ex: orçamento)..."
                            className="text-xs h-9 bg-muted/40 border-border"
                          />
                          <Button onClick={handleAddKeyword} size="sm" className="h-9 px-3 bg-foreground text-background font-bold">
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>

                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {keywords.map((kw) => (
                            <Badge key={kw} variant="secondary" className="gap-1.5 text-xs py-1 px-2.5 bg-muted border border-border">
                              #{kw}
                              <button onClick={() => handleRemoveKeyword(kw)} className="hover:text-destructive">
                                <X className="w-3 h-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 3: RESPOSTA PÚBLICA NO POST */}
            <TabsContent value="feed" className="space-y-4 pt-3">
              <Card className="border-border bg-card">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-border pb-3">
                    <div>
                      <h3 className="font-headline font-black text-sm uppercase tracking-wider text-foreground">
                        Resposta Pública no Comentário do Post
                      </h3>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Aparece logo abaixo do comentário do cliente, gerando prova social para os outros seguidores.
                      </p>
                    </div>
                    <Switch checked={publicReplyEnabled} onCheckedChange={setPublicReplyEnabled} />
                  </div>

                  {publicReplyEnabled && (
                    <div className="space-y-3">
                      <label className="text-xs font-headline font-bold uppercase tracking-wider text-foreground">
                        Frases para Rotação Automática (Evita que o Instagram ache que é spam):
                      </label>

                      <div className="space-y-2">
                        {publicReplies.map((reply, idx) => (
                          <div key={idx} className="flex items-center gap-2 p-2.5 rounded-xl border border-border bg-muted/20 text-xs text-foreground">
                            <span className="font-mono text-muted-foreground text-[10px]">#{idx + 1}</span>
                            <span className="flex-1">{reply}</span>
                            {publicReplies.length > 1 && (
                              <button onClick={() => handleRemovePublicReply(idx)} className="text-muted-foreground hover:text-destructive p-1">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>

                      <div className="flex gap-2 pt-1">
                        <Input 
                          value={newPublicReply}
                          onChange={(e) => setNewPublicReply(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleAddPublicReply()}
                          placeholder="Adicionar nova variação de resposta pública..."
                          className="text-xs h-9 bg-muted/40 border-border"
                        />
                        <Button onClick={handleAddPublicReply} size="sm" className="h-9 px-3 bg-foreground text-background font-bold">
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 4: MENSAGEM NO DIRECT (DM PRIVADA) */}
            <TabsContent value="direct" className="space-y-4 pt-3">
              <Card className="border-border bg-card">
                <CardContent className="p-5 space-y-4">
                  <h3 className="font-headline font-black text-sm uppercase tracking-wider text-foreground border-b border-border pb-3">
                    Mensagem Privada de Abertura (Private Reply)
                  </h3>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-headline font-bold uppercase tracking-wider text-foreground">
                        Texto da DM (Suporta tag <code className="text-primary-fixed">{'{nome}'}</code>):
                      </label>
                    </div>
                    <Textarea 
                      rows={5}
                      value={privateMessage}
                      onChange={(e) => setPrivateMessage(e.target.value)}
                      className="text-xs bg-muted/30 border-border text-foreground leading-relaxed rounded-xl font-sans"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1">
                      <label className="text-[11px] font-headline font-bold uppercase text-foreground">Texto do Botão / CTA:</label>
                      <Input 
                        value={ctaText}
                        onChange={(e) => setCtaText(e.target.value)}
                        className="text-xs h-9 bg-muted/40 border-border"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-headline font-bold uppercase text-foreground">Link de Destino do App:</label>
                      <Input 
                        value={ctaUrl}
                        onChange={(e) => setCtaUrl(e.target.value)}
                        className="text-xs h-9 bg-muted/40 border-border font-mono text-[11px]"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/20">
                    <div>
                      <div className="text-xs font-headline font-bold text-foreground">Anexar Cartão / Logo do Estúdio</div>
                      <p className="text-[10px] text-muted-foreground">Envia o banner oficial do Somos 1 Studio junto na DM.</p>
                    </div>
                    <Switch checked={includeMedia} onCheckedChange={setIncludeMedia} />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* RIGHT COLUMN: Interactive Live Instagram Phone Mockup (Meta Style) */}
        <div className="lg:col-span-5 space-y-4 sticky top-6">
          <Card className="border-border bg-card shadow-lg overflow-hidden">
            <div className="p-3.5 border-b border-border bg-muted/40 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-foreground" />
                <span className="font-headline font-bold text-xs uppercase tracking-wider text-foreground">
                  Simulador de Celular (Live Preview)
                </span>
              </div>
              
              <div className="flex gap-1 bg-muted p-0.5 rounded-lg border border-border">
                <button
                  type="button"
                  onClick={() => setSimulatorTab('feed')}
                  className={`text-[9px] font-headline uppercase font-bold px-2 py-1 rounded-md transition-all ${
                    simulatorTab === 'feed' ? 'bg-foreground text-background shadow-xs' : 'text-muted-foreground'
                  }`}
                >
                  Post
                </button>
                <button
                  type="button"
                  onClick={() => setSimulatorTab('dm')}
                  className={`text-[9px] font-headline uppercase font-bold px-2 py-1 rounded-md transition-all ${
                    simulatorTab === 'dm' ? 'bg-foreground text-background shadow-xs' : 'text-muted-foreground'
                  }`}
                >
                  Direct
                </button>
                <button
                  type="button"
                  onClick={() => setSimulatorTab('story')}
                  className={`text-[9px] font-headline uppercase font-bold px-2 py-1 rounded-md transition-all ${
                    simulatorTab === 'story' ? 'bg-foreground text-background shadow-xs' : 'text-muted-foreground'
                  }`}
                >
                  Story
                </button>
              </div>
            </div>

            <CardContent className="p-4 flex flex-col items-center justify-center bg-black/95">
              {/* Phone Frame */}
              <div className="w-[320px] rounded-[38px] border-4 border-zinc-700 bg-zinc-950 shadow-2xl overflow-hidden flex flex-col relative text-white text-left font-sans">
                {/* Phone Speaker & Camera Notch */}
                <div className="w-full h-6 bg-zinc-950 flex items-center justify-center relative border-b border-zinc-800/40">
                  <div className="w-16 h-3 bg-zinc-800 rounded-full" />
                </div>

                {/* Instagram Header Inside Phone */}
                <div className="px-3.5 py-2 border-b border-zinc-800 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-white text-black font-black text-[9px] flex items-center justify-center">
                      S1
                    </div>
                    <div>
                      <div className="font-bold text-[11px] flex items-center gap-1">
                        somos1tattoo
                        <Badge variant="secondary" className="h-3 text-[8px] px-1 bg-blue-600 text-white border-none">✓</Badge>
                      </div>
                      <div className="text-[8px] text-zinc-400">Somos 1 Studio</div>
                    </div>
                  </div>
                  <Instagram className="w-4 h-4 text-zinc-400" />
                </div>

                {/* SCREEN VIEW 1: FEED POST & COMMENT */}
                {simulatorTab === 'feed' && (
                  <div className="p-3 space-y-3 min-h-[360px] flex flex-col justify-between">
                    <div className="space-y-2">
                      {/* Post Thumbnail Preview */}
                      <div className="w-full h-32 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center relative overflow-hidden group">
                        <img 
                          src="/somos1-logo-official.png" 
                          alt="Post preview" 
                          className="w-16 h-16 object-contain opacity-80"
                        />
                        <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/70 text-[9px] font-mono">
                          Flash Tattoo • Blackwork
                        </div>
                      </div>

                      {/* Post Actions */}
                      <div className="flex items-center justify-between py-1 text-zinc-400">
                        <div className="flex items-center gap-3">
                          <Heart className="w-4 h-4 hover:text-red-500 cursor-pointer" />
                          <MessageCircle className="w-4 h-4 text-white" />
                          <Share2 className="w-4 h-4" />
                        </div>
                        <Bookmark className="w-4 h-4" />
                      </div>

                      {/* Customer Comment Bubble */}
                      <div className="bg-zinc-900/90 p-2.5 rounded-xl border border-zinc-800 text-[11px] space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-zinc-200">@cliente_tattoo</span>
                          <span className="text-[9px] text-zinc-500">2 min</span>
                        </div>
                        <p className="text-zinc-300 font-sans text-xs">
                          {simulatedCustomerText}
                        </p>
                      </div>

                      {/* Studio Public Reply */}
                      {publicReplyEnabled && (
                        <div className="ml-4 bg-zinc-900/40 border-l-2 border-white pl-2.5 py-1 text-[11px] space-y-0.5 animate-in fade-in">
                          <div className="flex items-center gap-1">
                            <span className="font-bold text-white text-[10px]">somos1tattoo</span>
                            <span className="text-[8px] bg-zinc-800 px-1 rounded text-zinc-400">Autor</span>
                          </div>
                          <p className="text-zinc-300 text-[10px]">
                            {publicReplies[0] || 'Te mandamos todos os detalhes no Direct! 🚀'}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Banner Notice */}
                    <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[9px] text-emerald-300 flex items-center gap-1.5">
                      <Zap className="w-3 h-3 shrink-0" />
                      <span>Chamada no Direct disparada automaticamente!</span>
                    </div>
                  </div>
                )}

                {/* SCREEN VIEW 2: DIRECT MESSAGE (DM) */}
                {simulatorTab === 'dm' && (
                  <div className="p-3 space-y-3 min-h-[360px] flex flex-col justify-between">
                    <div className="space-y-2.5">
                      <div className="text-center text-[9px] text-zinc-500 py-1">
                        Hoje às 14:32 • Chat com @somos1tattoo
                      </div>

                      {/* Customer Question in DM */}
                      <div className="flex justify-end">
                        <div className="bg-blue-600 text-white p-2.5 rounded-2xl rounded-tr-xs text-[11px] max-w-[85%] leading-relaxed shadow-xs">
                          {simulatedCustomerText}
                        </div>
                      </div>

                      {/* Studio AI Automated Response */}
                      <div className="flex justify-start">
                        <div className="bg-zinc-800/90 text-zinc-100 p-2.5 rounded-2xl rounded-tl-xs text-[11px] max-w-[90%] space-y-2 border border-zinc-700/40">
                          {includeMedia && (
                            <div className="w-full h-20 rounded-lg bg-zinc-900 border border-zinc-700 flex items-center justify-center overflow-hidden">
                              <img src="/somos1-logo.png" alt="Studio" className="w-12 h-12 object-contain" />
                            </div>
                          )}

                          <p className="leading-relaxed whitespace-pre-line text-[11px]">
                            {simulatedAiReply || privateMessage.replace('{nome}', 'Marcos')}
                          </p>

                          {/* CTA Button */}
                          <div className="pt-1">
                            <a 
                              href={ctaUrl} 
                              target="_blank" 
                              rel="noreferrer"
                              className="w-full py-1.5 px-3 rounded-lg bg-white text-black font-headline font-black text-[10px] uppercase tracking-wider flex items-center justify-center gap-1 hover:bg-zinc-200 transition-colors"
                            >
                              <span>{ctaText}</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="text-[9px] text-center text-zinc-500">
                      Mensagem automatizada via Meta Instagram API
                    </div>
                  </div>
                )}

                {/* SCREEN VIEW 3: STORIES */}
                {simulatorTab === 'story' && (
                  <div className="p-3 space-y-3 min-h-[360px] flex flex-col justify-between relative">
                    <div className="space-y-2">
                      {/* Story Top Progress Bars */}
                      <div className="flex gap-1 py-1">
                        <div className="flex-1 h-0.5 bg-white rounded-full" />
                        <div className="flex-1 h-0.5 bg-zinc-700 rounded-full" />
                      </div>

                      {/* Story Content Frame */}
                      <div className="w-full h-44 rounded-xl bg-zinc-900 border border-zinc-800 flex flex-col items-center justify-center p-3 text-center relative overflow-hidden">
                        <Flame className="w-8 h-8 text-amber-500 mb-1 animate-pulse" />
                        <span className="font-headline font-bold text-xs uppercase text-zinc-100">Flash Tattoo do Dia</span>
                        <span className="text-[10px] text-zinc-400">Responda para orçar ou agendar</span>
                      </div>

                      {/* Reaction Alert Banner */}
                      <div className="bg-zinc-900/90 p-2.5 rounded-xl border border-zinc-800 text-[10px] space-y-1">
                        <div className="flex items-center gap-1.5 text-zinc-200">
                          <span className="font-bold">@cliente_tattoo</span>
                          <span className="text-zinc-500">respondeu:</span>
                          <span className="text-amber-400">"🔥 Quero fazer esse flash!"</span>
                        </div>
                        <div className="text-emerald-400 text-[9px] flex items-center gap-1 mt-1">
                          <CheckCircle2 className="w-3 h-3" /> IA disparou DM privada com as opções e link de agenda.
                        </div>
                      </div>
                    </div>

                    <div className="text-[9px] text-center text-zinc-500">
                      Disparo imediato ao receber reação ou resposta ao Story
                    </div>
                  </div>
                )}

                {/* Phone Bottom Bar */}
                <div className="w-full h-5 bg-zinc-950 flex items-center justify-center">
                  <div className="w-24 h-1 bg-zinc-600 rounded-full" />
                </div>
              </div>

              {/* Interactive Simulator Controller */}
              <div className="w-full mt-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-headline font-bold uppercase text-zinc-400">
                    Testar Pergunta do Cliente:
                  </span>
                  <span className="text-[9px] text-zinc-500">Simula o cérebro IA</span>
                </div>
                
                <div className="flex gap-2">
                  <Input 
                    value={simulatedCustomerText}
                    onChange={(e) => setSimulatedCustomerText(e.target.value)}
                    placeholder="Digite uma dúvida de teste..."
                    className="h-9 text-xs bg-zinc-900 border-zinc-800 text-white"
                  />
                  <Button 
                    onClick={handleRunSimulation}
                    disabled={isSimulating}
                    size="sm" 
                    className="h-9 px-3 bg-white text-black font-bold hover:bg-zinc-200 shrink-0 text-xs"
                  >
                    {isSimulating ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
