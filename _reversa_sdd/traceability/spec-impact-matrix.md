# Matriz de Impacto de Especificações (Spec Impact Matrix)

> Gerado pelo Reversa Architect em 2026-10-03 (Nível: Detalhado)
> Escala de Confiança: 🟢 CONFIRMADO (Código)

---

## 1. Matriz de Dependência Cruzada entre Módulos

Esta matriz define o efeito colateral de alterações em cada subsistema do SuperApp:

| Módulo Alterado | Impacto no CRM | Impacto no Indica Aí | Impacto na Agenda | Impacto no WhatsApp | Impacto na Galeria | Impacto no Admin |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| **CRM & Funil Comercial** | — | Baixo | Médio (reabre bookings) | Alto (dispara mensagens) | Baixo | Alto (métricas dashboard) |
| **Indica Aí (Afiliados)** | Médio (origem do lead) | — | Alto (saldo de créditos) | Médio (notificações) | Baixo | Alto (auditoria de saldos) |
| **Agenda & Booking** | Alto (cria/atualiza leads) | Alto (dispara comissões) | — | Alto (gatilho de confirmação) | Baixo | Alto (calendário diário) |
| **Automação WhatsApp & n8n** | Alto (status de entrega) | Baixo | Alto (confirmação e lembrete) | — | Baixo | Alto (logs e instâncias) |
| **Galeria & Portfólio IA** | Baixo | Médio (leads por posts) | Baixo | Baixo | — | Baixo |
| **Painel Admin & Configurações** | Alto (regras globais) | Alto (taxas e comissões) | Alto (bloqueios e slots) | Alto (chaves API) | Baixo | — |

---

## 2. Pontos de Acoplamento Crítico
1. **`Booking` ➔ `User.creditsBalance`:** O momento da reserva deduz saldo transacionalmente. Qualquer erro aqui impacta diretamente a carteira do usuário.
2. **`Booking.status = COMPLETED` ➔ `buildReferralTree`:** A conclusão de uma sessão é o único gatilho que computa comissão para a árvore de afiliados e move o cliente para o bucket `quente` da carteira pós-tattoo.
3. **`whatsappService.sendMessage`:** Chamado por Booking, CRM e Carteira. A falha afeta a comunicação com o cliente em todas as frentes.
