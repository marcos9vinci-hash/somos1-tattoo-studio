# Automação WhatsApp & n8n — Especificação de Requisitos (Requirements)

> Status: 🟢 CONFIRMADO (Bloqueio Arquitetural Homologado)
> Layout: Feature-Folder / Módulo

---

## 1. Visão Geral
Motor de mensageria externa resiliente para WhatsApp. Garante que confirmações de agendamento, lembretes de sessão e follow-ups de pós-venda/cicatrização cheguem ao cliente sem falhas, utilizando primariamente o n8n para inteligência de cadência e a Evolution API direta como canal redundante de entrega imediata.

---

## 2. Responsabilidades
- Despacho de mensagens via Webhook n8n com tolerância a timeout de até 4.000 ms.
- Fallback instantâneo para a Evolution API direta caso o webhook falhe ou demore mais de 4s.
- Cumprimento rigoroso do bloqueio arquitetural: lembretes calculados antes da sessão e follow-ups após a sessão.
- Análise semântica de respostas de tatuadores no WhatsApp para comandos rápidos de aprovação, recusa ou reagendamento.

---

## 3. Regras de Negócio

| ID | Regra | Confiança | Evidência no Código |
|---|---|:---:|---|
| **RN-WTS-01** | Lembrete de sessão deve ser disparado com antecedência em relação ao início da tattoo (`Sessao - Antecedencia`). | 🟢 | `src/lib/whatsappService.ts:14-15` |
| **RN-WTS-02** | Follow-up de cicatrização deve ser disparado após o término da sessão (`Sessao + Delay`). | 🟢 | `src/lib/whatsappService.ts:16-17` |
| **RN-WTS-03** | Timeout estrito de 4.000 ms no webhook n8n com fallback imediato para `/message/sendText`. | 🟢 | `src/lib/whatsappService.ts:63` |
| **RN-WTS-04** | Telefone deve ser normalizado com prefixo DDI 55 antes de qualquer requisição externa. | 🟢 | `src/lib/whatsappService.ts:60` |

---

## 4. Requisitos Funcionais

| ID | Requisito | MoSCoW | Critério de Aceite |
|---|---|:---:|---|
| **RF-WTS-01** | Enviar mensagem formatada contendo tags `{cliente}`, `{data}`, `{horario}` interpoladas. | Must | As tags devem ser substituídas pelos valores reais antes do despacho. |
| **RF-WTS-02** | Executar fallback transparente para Evolution API sem lançar exceções bloqueantes para a UI. | Must | Em caso de falha no n8n, a mensagem deve ser enviada via Evolution e retornar `true`. |
| **RF-WTS-03** | Classificar intenções do tatuador via regex com confiança mínima (`APPROVE`, `REJECT`, `RESCHEDULE`). | Should | Respostas como "pode mandar", "1" ou "show" devem ser reconhecidas como aprovação. |
