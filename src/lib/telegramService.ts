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
  async editarMensagemTexto(chatId: string, messageId: number, novoTexto: string) {
    try {
      await fetch(`${TELEGRAM_API_URL}/editMessageText`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          message_id: messageId,
          text: novoTexto,
          parse_mode: 'Markdown'
        })
      });
    } catch (e) {
      console.warn('Erro ao editar mensagem no Telegram:', e);
    }
  }
};
