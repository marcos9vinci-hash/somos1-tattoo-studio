# ADR 002: Redundância e Fallback Síncrono de Mensageria (n8n + Evolution API)

> Status: Aprovado / Congelado (Bloqueio Arquitetural)
> Data: 2026-09-29 / 2026-10-03
> Decisores: Arquitetura Somos 1 / Indica Aí
> Escala de Confiança: 🟢 CONFIRMADO (Código)

---

## Contexto
O estúdio depende criticamente do envio de mensagens de confirmação de agendamento e lembretes para evitar faltas (No-Show). O n8n é utilizado para orquestrar atrasos programados e cadências complexas, porém eventuais instabilidades no servidor VPS ou timeouts de rede não podem, em hipótese alguma, impedir a entrega do WhatsApp para o cliente.

---

## Decisão
Estabelecer um roteador de mensageria com canal duplo em `src/lib/whatsappService.ts`:
1. O sistema tenta disparar primariamente via Webhook do n8n com um timeout estrito de **4.000 ms** gerenciado por `AbortController`.
2. Se o n8n não responder dentro de 4 segundos ou retornar código HTTP de erro, o sistema aciona imediatamente o **fallback direto para a Evolution API** (`/message/sendText/{instance}`), garantindo a entrega da mensagem sem travar a interface do usuário.

---

## Alternativas Consideradas
- **Fila de Mensageria em Banco (RabbitMQ/BullMQ):** Descartado por adicionar complexidade operacional desnecessária para o volume atual de atendimentos.
- **Disparo Exclusivo pelo n8n:** Rejeitado após incidentes onde falhas pontuais no webhook geravam perda de confirmações de clientes.

---

## Consequências
- **Positivas:** Taxa de entrega de confirmações de agendamento próxima de 100%; resiliência total contra quedas temporárias do n8n.
- **Negativas / Atenção:** Quando o fallback direto é acionado, recursos de atraso (delays) orquestrados pelo n8n são convertidos em envio imediato.
