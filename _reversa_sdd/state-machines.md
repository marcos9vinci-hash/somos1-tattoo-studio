# Máquinas de Estado — SuperApp Somos 1 / Indica Aí

> Gerado pelo Reversa Detective em 2026-10-03 (Nível: Detalhado)
> Escala de Confiança: 🟢 CONFIRMADO (Extraído dos tipos e serviços)

---

## 1. Máquina de Estados: `Lead` (Funil Comercial)

Controla o percurso de aquisição de um potencial cliente desde a primeira mensagem até o fechamento.

```mermaid
stateDiagram-v2
    [*] --> novo: Contato via WhatsApp / Instagram / Indica Aí
    novo --> qualificacao: Agente Triagem encaminha / Coleta de ideia
    novo --> followup: Cliente parou de responder
    
    qualificacao --> negociacao: SPIN Selling concluído / Orçamento solicitado
    qualificacao --> perdido: Desistência explícita / Fora de perfil
    qualificacao --> followup: Sem retorno na qualificação
    
    negociacao --> agendado: Sinal pago / Data escolhida
    negociacao --> perdido: Valor incompatível
    negociacao --> followup: Dúvidas de sinal / Sem resposta
    
    agendado --> concluido: Sessão executada com sucesso
    agendado --> followup: Desmarcou / Pediu reagendamento
    
    concluido --> pos_venda: 0 a 15 dias pós-sessão (Cicatrização)
    
    pos_venda --> [*]: > 15 dias -> Migra para Carteira de Clientes
    perdido --> [*]
    
    followup --> negociacao: Reengajamento com sucesso
    followup --> perdido: Sem resposta após régua de cadência
```

---

## 2. Máquina de Estados: `ClienteCRM` (Carteira pós-tattoo)

Controla a esteira de retenção e temperatura ao longo dos meses pós-tattoo:

```mermaid
stateDiagram-v2
    [*] --> quente: Sessão recém-concluída (0 a 7 dias)
    quente --> morno: 8 a 30 dias (Foto do resultado e retoque)
    morno --> esfriando: 31 a 90 dias (Tempo ideal para 2ª tattoo)
    esfriando --> alerta: 91 a 179 dias (Risco de expiração de créditos aos 180d)
    alerta --> expirado: >= 180 dias (Cliente inativo há mais de 6 meses)
    
    quente --> desmarcou: No-Show em sessão subsequente
    morno --> desmarcou: No-Show em sessão subsequente
    esfriando --> desmarcou: No-Show em sessão subsequente
    
    desmarcou --> emReativacao: Campanha de resgate aceita
    esfriando --> emReativacao: Reaberto no Funil Comercial
    alerta --> emReativacao: Reaberto no Funil Comercial
    expirado --> emReativacao: Reaberto no Funil Comercial
    
    emReativacao --> quente: Nova tattoo concluída no estúdio
    emReativacao --> esfriando: Lead de reativação perdido
```

---

## 3. Máquina de Estados: `Booking` (Agenda & Sessões)

```mermaid
stateDiagram-v2
    [*] --> pending_approval: Cliente solicita data e horário no app
    
    pending_approval --> approved: Tatuador/Admin aprova o slot
    pending_approval --> rejected: Conflito de agenda ou recusa
    
    approved --> deposit_paid: Sinal de reserva quitado
    approved --> rescheduled: Cliente solicita alteração de horário
    
    deposit_paid --> completed: Sessão realizada (Dispara créditos Indica Aí)
    deposit_paid --> no_show: Cliente faltou sem justificativa
    deposit_paid --> rescheduled: Reagendamento com antecedência
    
    rescheduled --> approved: Nova data aceita
    
    completed --> [*]
    rejected --> [*]
    no_show --> [*]
```

---

## 4. Máquina de Estados: `SocialPost` (Galeria & Conteúdo Social)

```mermaid
stateDiagram-v2
    [*] --> rascunho: Post criado no editor / IA sugere copy
    rascunho --> pronto: Arte e legenda aprovadas pelo tatuador
    pronto --> agendado: Enfileirado no Buffer Schedule
    agendado --> publicado: Publicação disparada na API do Instagram
    publicado --> [*]
```
