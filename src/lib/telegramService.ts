// ============================================================================
// TELEGRAM BOT SERVICE — SOMOS 1 TATTOO STUDIO
// Bot: @somos1tattoo_bot
// ============================================================================

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

const TELEGRAM_TOKEN = import.meta.env.VITE_TELEGRAM_BOT_TOKEN || '8824178251:AAFu-yv94YS-XGKHXh1t_Q-EIrThiYLXYC4';
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;
const DEFAULT_ADMIN_CHAT_ID = import.meta.env.VITE_TELEGRAM_ADMIN_CHAT_ID || '894069351';

export interface TelegramAdminConfig {
  chatId: string;
  username?: string;
  firstName?: string;
  ativo: boolean;
  notificarPresenca: boolean;
  notificarNovosLeads: boolean;
  notificarSinal: boolean;
}

export const telegramService = {
  /**
   * Verifica se o token do bot está válido na API do Telegram
   */
  async getBotInfo() {
    try {
      const res = await fetch(`${TELEGRAM_API_URL}/getMe`);
      return await res.json();
    } catch (e) {
      console.error('Erro ao verificar bot do Telegram:', e);
      return null;
    }
  },

  /**
   * Obtém a configuração do administrador do Telegram no Firestore
   */
  async getAdminConfig(): Promise<TelegramAdminConfig> {
    try {
      const snap = await getDoc(doc(db, 'configuracoes', 'telegram_admin'));
      if (snap.exists()) {
        const data = snap.data() as TelegramAdminConfig;
        if (data.chatId) return data;
      }
    } catch (e) {
      console.warn('Erro ao carregar telegram_admin config do Firestore:', e);
    }
    // Fallback padrão para Marcos Vinicius
    return {
      chatId: DEFAULT_ADMIN_CHAT_ID,
      firstName: 'Marcos',
      username: 'Marcos9vinci1',
      ativo: true,
      notificarPresenca: true,
      notificarNovosLeads: true,
      notificarSinal: true
    };
  },

  /**
   * Salva o Chat ID do tatuador/admin
   */
  async salvarAdminConfig(config: Partial<TelegramAdminConfig>): Promise<void> {
    await setDoc(doc(db, 'configuracoes', 'telegram_admin'), {
      ...config,
      ativo: true,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  },

  /**
   * Busca as últimas mensagens no Telegram para detectar automaticamente
   * quem deu /start e registrar como o Admin do Studio!
   */
  async sincronizarUltimoChatId(): Promise<{ chatId: string; nome: string } | null> {
    try {
      const res = await fetch(`${TELEGRAM_API_URL}/getUpdates?limit=10`);
      const data = await res.json();
      if (!data.ok || !data.result || data.result.length === 0) return null;

      // Pega a mensagem mais recente
      const ultimosUpdates = [...data.result].reverse();
      for (const update of ultimosUpdates) {
        const msg = update.message || update.callback_query?.message;
        if (msg && msg.chat && msg.chat.id) {
          const chatId = String(msg.chat.id);
          const nome = msg.chat.first_name || msg.chat.username || 'Tatuador';
          
          await this.salvarAdminConfig({
            chatId,
            firstName: nome,
            username: msg.chat.username,
            ativo: true,
            notificarPresenca: true,
            notificarNovosLeads: true,
            notificarSinal: true
          });

          return { chatId, nome };
        }
      }
      return null;
    } catch (e) {
      console.error('Erro ao sincronizar updates do Telegram:', e);
      return null;
    }
  },

  /**
   * Envia mensagem de texto com suporte a botões inline (Keyboard)
   */
  async enviarMensagem(chatId: string, texto: string, inlineKeyboard?: any[][]) {
    try {
      const body: any = {
        chat_id: chatId,
        text: texto,
        parse_mode: 'Markdown'
      };

      if (inlineKeyboard && inlineKeyboard.length > 0) {
        body.reply_markup = {
          inline_keyboard: inlineKeyboard
        };
      }

      const res = await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      return await res.json();
    } catch (e) {
      console.error('Erro ao enviar mensagem no Telegram:', e);
      return null;
    }
  },

  /**
   * Envia o alerta interativo de Confirmação de Presença com botões Sim e Não
   */
  async enviarAlertaPresenca(sessao: any) {
    const admin = await this.getAdminConfig();
    if (!admin?.chatId) return false;

    const bookingId = sessao.id || '';
    const cleanPhone = (sessao.telefone || '').replace(/\D/g, '');

    const texto = `🔔 *CONFIRMAÇÃO DE SESSÃO — SOMOS 1* 🎨\n\n` +
      `👤 *Cliente:* ${sessao.nome}\n` +
      `⏰ *Horário:* ${sessao.hora || 'Hoje'}\n` +
      `💰 *Valor:* R$ ${sessao.valor || 0}\n` +
      `📝 *Projeto:* ${sessao.ideia || 'Tatuagem no estúdio'}\n\n` +
      `👉 *O cliente compareceu à sessão no estúdio?*`;

    const inlineKeyboard = [
      [
        { text: '✅ Sim, Compareceu', callback_data: `presenca:sim:${bookingId}` },
        { text: '❌ Não Compareceu', callback_data: `presenca:nao:${bookingId}` }
      ],
      cleanPhone ? [
        { text: '💬 Abrir WhatsApp do Cliente', url: `https://wa.me/55${cleanPhone}` }
      ] : []
    ].filter(row => row.length > 0);

    const res = await this.enviarMensagem(admin.chatId, texto, inlineKeyboard);
    return res?.ok === true;
  },

  /**
   * Envia alerta quando um lead entra em negociação ou sinal é solicitado
   */
  async enviarAlertaSinal(leadNome: string, totalValor: number, sinalValor: number, leadId: string) {
    const admin = await this.getAdminConfig();
    if (!admin?.chatId) return false;

    const texto = `💰 *SINAL DE RESERVA SOLICITADO* 🎨\n\n` +
      `👤 *Lead:* ${leadNome}\n` +
      `💵 *Total da Tattoo:* R$ ${totalValor}\n` +
      `🔒 *Sinal Recomendado (30%):* R$ ${sinalValor}\n\n` +
      `Assim que o cliente fizer o PIX, toque abaixo para confirmar e travar a data:`;

    const inlineKeyboard = [
      [
        { text: '✅ Confirmar Sinal Pago', callback_data: `sinal:pago:${leadId}` }
      ]
    ];

    const res = await this.enviarMensagem(admin.chatId, texto, inlineKeyboard);
    return res?.ok === true;
  },

  /**
   * Responde ao clique de botão no Telegram (tira o ícone de carregando do botão)
   */
  async responderCallback(callbackQueryId: string, texto?: string) {
    try {
      await fetch(`${TELEGRAM_API_URL}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callback_query_id: callbackQueryId,
          text: texto || 'Ação registrada com sucesso!',
          show_alert: false
        })
      });
    } catch (e) {
      console.warn('Erro ao responder callback Telegram:', e);
    }
  },

  /**
   * Atualiza a mensagem original no Telegram para mostrar a confirmação
   */
  async editarMensagemTexto(chatId: string, messageId: number, novoTexto: string, inlineKeyboard?: any[][]) {
    try {
      const body: any = {
        chat_id: chatId,
        message_id: messageId,
        text: novoTexto,
        parse_mode: 'Markdown'
      };
      if (inlineKeyboard) {
        body.reply_markup = { inline_keyboard: inlineKeyboard };
      }

      await fetch(`${TELEGRAM_API_URL}/editMessageText`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
    } catch (e) {
      console.warn('Erro ao editar mensagem no Telegram:', e);
    }
  },

  /**
   * Envia o painel de comando com os 6 Agentes Especializados da Somos 1
   */
  async enviarMenuPrincipal(chatIdParam?: string) {
    const admin = await this.getAdminConfig();
    const chatId = chatIdParam || admin?.chatId;
    if (!chatId) return false;

    const texto = 
      '🏢 *QUARTEL GENERAL — SOMOS 1 TATTOO* 🎨\n\n' +
      'Fala, *Marcos*! Aqui está o seu painel de controle com os *6 Agentes Especializados* do estúdio.\n\n' +
      'Toque em qualquer agente abaixo para consultar a esteira dele ou ver ações pendentes:\n\n' +
      '🛎️ *1. Recepção:* Novos contatos & triagem inicial\n' +
      '🎯 *2. SDR Consultivo:* Qualificação da ideia & SPIN\n' +
      '💬 *3. Jonathan:* Propostas, negociação & Sinal PIX\n' +
      '📅 *4. Secretário:* Confirmações & blindagem da agenda\n' +
      '✨ *5. Juliana:* Pós-venda, cuidados & cicatrização\n' +
      '🔕 *6. Avalanche:* Resgate de quem sumiu ou faltou';

    const inline_keyboard = [
      [
        { text: '🛎️ 1. Triagem & Recepção', callback_data: 'agente:novo' },
        { text: '🎯 2. SDR (Clone Dono)', callback_data: 'agente:qualificacao' }
      ],
      [
        { text: '💬 3. Fechamento & Sinal PIX', callback_data: 'agente:negociacao' },
        { text: '📅 4. Secretário da Agenda', callback_data: 'agente:agendado' }
      ],
      [
        { text: '✨ 5. Juliana (Pós-Venda)', callback_data: 'agente:pos_venda' },
        { text: '🔕 6. Avalanche (Resgate)', callback_data: 'agente:followup' }
      ],
      [
        { text: '📊 Relatório Geral do Estúdio', callback_data: 'estudio:status' }
      ],
      [
        { text: '🌐 Abrir CRM no Navegador', url: 'https://somos1-tattoo-studio.vercel.app/admin' }
      ]
    ];

    const res = await this.enviarMensagem(chatId, texto, inline_keyboard);
    return res?.ok === true;
  },

  /**
   * Monta o texto de relatório específico para cada agente consultado
   */
  montarTextoAgente(tipo: string, leads: any[], sessoes: any[], clientes: any[]): { texto: string; botoes: any[][] } {
    const voltarBtn = [{ text: '🔙 Voltar ao Painel dos Agentes', callback_data: 'menu:principal' }];

    switch (tipo) {
      case 'novo': {
        const novos = leads.filter(l => l.estagio === 'novo');
        const lista = novos.slice(0, 5).map(l => `• *${l.nome}* (${l.telefone || 'sem zap'})\n  Origem: _${l.origem || 'whatsapp'}_`).join('\n') || 'Nenhum contato pendente de triagem!';
        return {
          texto: `🛎️ *AGENTE 01: TRIAGEM & RECEPÇÃO*\n\n` +
                 `👥 *Contatos na esteira:* ${novos.length}\n` +
                 `🎯 *Papel:* Recepção ágil e identificação de interesse.\n\n` +
                 `📋 *Últimos contatos:*\n${lista}\n\n` +
                 `_A IA faz o acolhimento inicial e direciona para a qualificação de estilo._`,
          botoes: [
            [{ text: '🌐 Ver no CRM', url: 'https://somos1-tattoo-studio.vercel.app/admin' }],
            voltarBtn
          ]
        };
      }

      case 'qualificacao': {
        const quals = leads.filter(l => l.estagio === 'qualificacao');
        const lista = quals.slice(0, 5).map(l => `• *${l.nome}* — ${l.ideiaProjeto || l.estiloTatuagem || 'A definir ideia'}`).join('\n') || 'Nenhum lead em qualificação no momento!';
        return {
          texto: `🎯 *AGENTE 02: SDR CONSULTIVO (CLONE DO DONO)*\n\n` +
                 `👥 *Leads sendo qualificados:* ${quals.length}\n` +
                 `🧠 *Framework:* SPIN Selling + BANT\n\n` +
                 `📋 *Projetos em análise:*\n${lista}\n\n` +
                 `_A IA entende o estilo, tamanho e significado antes de passar para orçamento._`,
          botoes: [
            [{ text: '🌐 Abrir Funil Comercial', url: 'https://somos1-tattoo-studio.vercel.app/admin' }],
            voltarBtn
          ]
        };
      }

      case 'negociacao': {
        const negs = leads.filter(l => l.estagio === 'negociacao' || l.estagio === 'pronto');
        const totalEstimado = negs.reduce((acc, l) => acc + (l.spin?.ticketEstimado || l.orcamentoMaximo || 0), 0);
        const lista = negs.slice(0, 5).map(l => {
          const val = l.spin?.ticketEstimado || l.orcamentoMaximo || 0;
          const sinal = l.valorSinal || Math.round(val * 0.3);
          const status = l.sinalPago ? '✅ Sinal Pago' : `⏳ Aguardando R$ ${sinal} (30%)`;
          return `• *${l.nome}* — Total: R$ ${val}\n  ${status}`;
        }).join('\n\n') || 'Nenhuma proposta em negociação aberta!';

        return {
          texto: `💬 *AGENTE 03: JONATHAN (FECHAMENTO & SINAL PIX)*\n\n` +
                 `💰 *Pipeline em Negociação:* R$ ${totalEstimado.toLocaleString('pt-BR')}\n` +
                 `👥 *Leads nesta etapa:* ${negs.length}\n\n` +
                 `📋 *Propostas ativas:*\n${lista}\n\n` +
                 `_Foco: demonstrar valor, quebrar objeções e travar o Sinal de 30% via PIX!_`,
          botoes: [
            [{ text: '🌐 Gerenciar Propostas no CRM', url: 'https://somos1-tattoo-studio.vercel.app/admin' }],
            voltarBtn
          ]
        };
      }

      case 'agendado': {
        const ags = leads.filter(l => l.estagio === 'agendado');
        const sessoesLista = sessoes.slice(0, 4).map(s => `• *${s.nome}* às ${s.hora} (${s.data ? s.data.split('-').reverse().join('/') : 'Hoje'})`).join('\n') || 'Nenhuma sessão pendente de confirmação hoje!';
        return {
          texto: `📅 *AGENTE 04: SECRETÁRIO DA AGENDA*\n\n` +
                 `📆 *Tattoos Agendadas:* ${ags.length}\n` +
                 `🔔 *Confirmações Pendentes:* ${sessoes.length}\n\n` +
                 `📋 *Próximas Sessões:*\n${sessoesLista}\n\n` +
                 `_Foco: Blindar contra No-Show, enviar checklist pré-sessão e confirmar presenças._`,
          botoes: [
            sessoes.length > 0 ? [{ text: '🔔 Notificar Próxima Presença', callback_data: `presenca:alerta:${sessoes[0]?.id || ''}` }] : [],
            [{ text: '📅 Ver Calendário Completo', url: 'https://somos1-tattoo-studio.vercel.app/admin' }],
            voltarBtn
          ].filter(r => r.length > 0)
        };
      }

      case 'pos_venda': {
        const concluidos = leads.filter(l => l.estagio === 'pos_venda' || l.estagio === 'concluido');
        const clientesQuentes = clientes.filter(c => c.bucketTemperatura === 'quente');
        return {
          texto: `✨ *AGENTE 05: JULIANA (PÓS-VENDA & CICATRIZAÇÃO)*\n\n` +
                 `💉 *Tattoos Realizadas / Pós-Venda:* ${concluidos.length}\n` +
                 `🩹 *Em Cicatrização Crítica (0-7d):* ${clientesQuentes.length}\n\n` +
                 `📋 *Protocolo Ativo:*\n` +
                 `• Dia 1 a 3: Higienização e pomada cicatrizante\n` +
                 `• Dia 7 a 15: Foto da pele recuperada\n` +
                 `• Dia 30: Convite para review Google e nova tattoo\n\n` +
                 `_Cuidado humanizado que transforma cliente de 1 tattoo em fã fiel do estúdio!_`,
          botoes: [
            [{ text: '👥 Ver Carteira de Pós-Venda', url: 'https://somos1-tattoo-studio.vercel.app/admin' }],
            voltarBtn
          ]
        };
      }

      case 'followup': {
        const resgates = leads.filter(l => l.estagio === 'followup');
        return {
          texto: `🔕 *AGENTE 06: AVALANCHE (RESGATE & RECONEXÃO)*\n\n` +
                 `❄️ *Contatos para Resgatar:* ${resgates.length}\n` +
                 `🎯 *Missão:* Reaquecer leads que sumiram, deixaram de responder ou cancelaram.\n\n` +
                 `📋 *Abordagem:* Contato não invasivo com novidades de flashes, ideias salvas e horários liberados na agenda.`,
          botoes: [
            [{ text: '🌐 Ver Leads de Resgate', url: 'https://somos1-tattoo-studio.vercel.app/admin' }],
            voltarBtn
          ]
        };
      }

      default: {
        return {
          texto: `📊 *RELATÓRIO GERAL DO ESTÚDIO SOMOS 1*\n\n` +
                 `👥 *Total de Leads:* ${leads.length}\n` +
                 `📆 *Tattoos Marcadas:* ${leads.filter(l => l.estagio === 'agendado').length}\n` +
                 `✨ *Trabalhos Realizados:* ${leads.filter(l => l.estagio === 'pos_venda' || l.estagio === 'concluido').length}\n` +
                 `💰 *Pipeline Ativo:* R$ ${leads.filter(l => l.estagio === 'negociacao' || l.estagio === 'agendado').reduce((acc, l) => acc + (l.spin?.ticketEstimado || l.orcamentoMaximo || 0), 0).toLocaleString('pt-BR')}`,
          botoes: [
            [{ text: '🌐 Abrir Dashboard Executivo', url: 'https://somos1-tattoo-studio.vercel.app/admin' }],
            voltarBtn
          ]
        };
      }
    }
  }
};

