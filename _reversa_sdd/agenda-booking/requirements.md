# Agenda & Booking — Especificação de Requisitos (Requirements)

> Status: 🟢 CONFIRMADO (Extraído diretamente de `src/pages/Booking.tsx`, `src/types.ts`)
> Layout: Feature-Folder / Módulo

---

## 1. Visão Geral
Gerencia a disponibilidade física do estúdio, a seleção de slots pelos clientes e a esteira de aprovação e pagamento de sinal das tatuagens. Implementa travas financeiras para resguardar a margem operacional e conecta cada agendamento ao ciclo de vida de mensageria WhatsApp.

---

## 2. Responsabilidades
- Validar horários disponíveis com base em dias de funcionamento, limites diários e intervalos bloqueados.
- Permitir upload de imagens de referência com conversão em DataURL.
- Aplicar a trava de segurança financeira de até 50% de abatimento com créditos Indica Aí.
- Orquestrar a máquina de estados do agendamento (`pending_approval`, `approved`, `deposit_paid`, `completed`, `rescheduled`, `no_show`).
- Disparar o ciclo de automação WhatsApp (confirmação imediata e lembretes).

---

## 3. Regras de Negócio

| ID | Regra | Confiança | Evidência no Código |
|---|---|:---:|---|
| **RN-AGE-01** | Abatimento com créditos é limitado a no máximo 50% do valor estimado da tattoo (`Math.min(credits, value * 0.5)`). | 🟢 | `src/pages/Booking.tsx:121` |
| **RN-AGE-02** | Capacidade máxima diária é regida por `studio_settings.maxSessionsPerDay` (padrão: 5). | 🟢 | `src/pages/Booking.tsx:87` |
| **RN-AGE-03** | Datas contidas em `blockedDates` ou horários em `blockedIntervals` são bloqueados na seleção. | 🟢 | `src/pages/Booking.tsx:86-88` |
| **RN-AGE-04** | Duração estimada varia por porte: Pequena (60 min), Média (120 min), Grande (240 min). | 🟢 | `src/pages/Booking.tsx:84` |
| **RN-AGE-05** | Ao confirmar o agendamento, os créditos utilizados são deduzidos do usuário e registrados em `transactions` com tipo `BOOKING_DISCOUNT`. | 🟢 | `src/pages/Booking.tsx:153-164` |

---

## 4. Requisitos Funcionais

| ID | Requisito | MoSCoW | Critério de Aceite |
|---|---|:---:|---|
| **RF-AGE-01** | Exibir calendário interativo com datas bloqueadas desabilitadas. | Must | Datas passadas e datas em `blockedDates` devem aparecer cinzas e não-clicáveis. |
| **RF-AGE-02** | Permitir envio de fotos de referência para a sessão. | Should | As imagens devem ser carregadas e salvas na coleção `bookings`. |
| **RF-AGE-03** | Calcular automaticamente o valor estimado e o teto de créditos utilizável. | Must | Interface deve exibir o saldo disponível e travar o desconto em no máximo 50%. |
| **RF-AGE-04** | Disparar ciclo de mensagens WhatsApp via `whatsappService.triggerBookingLifecycle()`. | Must | Notificar imediatamente o cliente e programar os lembretes pré-sessão. |

---

## 5. Critérios de Aceitação (Gherkin)

```gherkin
Cenário: Cliente com saldo alto agenda tattoo Média
  Dado que o cliente tem 400 créditos no saldo
  E escolhe uma tattoo de porte "Média" com valor estimado de R$ 500
  Quando o cálculo de desconto for executado
  Então o sistema deve permitir abater no máximo 250 créditos (50% de R$ 500)
  E o cliente deve pagar os R$ 250 restantes em dinheiro/PIX
```
