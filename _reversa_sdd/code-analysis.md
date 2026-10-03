# Análise de Código e Algoritmos — Somos 1 / Indica Aí

> Gerado pelo **Reversa Archaeologist** em 03/10/2026 (Nível: Essencial).

## 1. Módulo CRM & Funil Comercial

### Arquitetura do Funil Duplo:
- **Funil Comercial de Leads (`getLeads`):** Processa apenas contatos ativos em negociação e agendamentos futuros/hoje (`b.date >= todayStr`).
- **Regra de 15 Dias:** Tattoos concluídas nos últimos 15 dias permanecem em `pos_venda` para acompanhamento de cicatrização. Após 15 dias, saem do funil e são promovidas 100% para a **Carteira de Temperatura**.
- **Esteira de Temperatura (`getClientes`):** Classifica todos os clientes do estúdio em baldes dinâmicos:
  - **Quente:** 0 a 7 dias pós-sessão (acompanhamento de cicatrização).
  - **Morno:** 8 a 30 dias (cicatrizado, alta receptividade para nova arte).
  - **Esfriando:** 31 a 90 dias (janela ideal para campanhas de reativação).
  - **Alerta:** 91 a 179 dias (risco de churn / esquecimento).
  - **Expirado:** 180+ dias (inatividade prolongada).
  - **Desmarcou:** Clientes com status `no_show` ou `rejected` para resgate comercial.

### Algoritmo de Extração Temporal Seguro (`extrairMsDeData`):
Converte formatos heterogêneos de data (`YYYY-MM-DD`, `DD/MM/YYYY`, timestamps do Firestore e ISO strings) para milissegundos uniformes, prevenindo erros de ordenação temporal.

## 2. Módulo Indica Aí (Sistema de Afiliados)

### Fórmulas de Comissão:
- **Comissão Nível 1 (Direta):** Percentual aplicado sobre o valor final da tatuagem do amigo indicado.
- **Comissão Nível 2 (Rede):** Bonificação creditada ao indicador originário quando sua rede gera novos clientes.
- **Abatimento:** Créditos são debitados no checkout de uma nova sessão ou acumulados na carteira virtual do usuário.

## 3. Módulo WhatsApp & Mensageria

### Resiliência de Envio (`whatsappService.sendMessage`):
1. Dispara payload JSON formatado com número (DDI 55 obrigatório) para o **Webhook do n8n** com timeout de 4 segundos.
2. Se o n8n estiver indisponível ou retornar erro, chaveia automaticamente para a **Evolution API Direta** (`/message/sendText/${instance}`).
3. Registra logs no console e persiste a mensagem na subcoleção `crm_messages` do cliente no Firestore.

