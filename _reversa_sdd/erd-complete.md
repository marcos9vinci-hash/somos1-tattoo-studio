# Diagrama Entidade-Relacionamento (ERD) — Firestore

> Gerado pelo Reversa Architect em 2026-10-03 (Nível: Detalhado)
> Escala de Confiança: 🟢 CONFIRMADO (Coleções Firestore)

---

## 1. Modelo de Dados Entidade-Relacionamento

O banco de dados NoSQL Firestore (`memorizeai-7b8fd`) é organizado pelas seguintes coleções principais:

```mermaid
erDiagram
    users ||--o{ bookings : "possui (1:N)"
    users ||--o{ transactions : "movimenta créditos (1:N)"
    users ||--o{ notifications : "recebe alertas (1:N)"
    users ||--o{ users : "indica (referredBy)"
    
    leads ||--o| bookings : "pode originar (1:1)"
    leads ||--o{ crm_messages : "possui histórico (1:N)"
    
    studio_settings ||--o{ bookings : "rege capacidade e slots"
    campaigns ||--o{ transactions : "bonifica indicações"

    users {
        string uid PK
        string phone "Telefone formatado"
        string name "Nome completo"
        string inviteCode "Código único de indicação"
        string referredBy FK "UID de quem o indicou"
        string tier "Bronze, Prata, Ouro, Diamante"
        number creditsBalance "Saldo de cashback disponível"
        string role "user | admin"
        timestamp createdAt
    }

    bookings {
        string id PK
        string userId FK "UID do cliente"
        string artistId FK "UID do tatuador"
        string date "Data YYYY-MM-DD"
        string time "Horário HH:mm"
        string size "Pequena | Média | Grande"
        string status "BookingStatus enum"
        number priceEstimated "Valor base"
        number depositPaid "Sinal pago"
        number creditsUsed "Créditos abatidos (max 50%)"
        string regiao_corpo "Local da tattoo"
        array fotos_referencia "URLs das referências"
        string descricao_servico "Ideia do projeto"
        boolean confirmationSent
        timestamp createdAt
    }

    leads {
        string id PK
        string nome "Nome do lead"
        string telefone "Telefone WhatsApp (chave deduplicação)"
        string origem "whatsapp | instagram | indicacao"
        string estagio "LeadStage enum"
        string temperatura "frio | morno | quente"
        string ideiaProjeto "Descrição do cliente"
        number orcamentoMaximo "Teto financeiro"
        json spin "Diagnóstico SPIN Selling"
        string responsavelAtendimento "Agente IA ou Atendente"
        timestamp createdAt
        timestamp updatedAt
    }

    transactions {
        string id PK
        string userId FK "UID do usuário titular"
        number amount "Valor (+ ou - créditos)"
        string type "referral | booking_discount | admin_adjustment"
        string description "Justificativa auditável"
        timestamp createdAt
    }

    notifications {
        string id PK
        string userId FK "UID do destinatário"
        string type "NotificationType enum"
        string title "Título da notificação"
        string message "Corpo da mensagem"
        boolean read "Status de leitura"
        timestamp createdAt
    }

    studio_settings {
        string id PK "main"
        array workingDays "0-6 dias de atendimento"
        json workingHours "start / end"
        json durations "Pequena, Média, Grande"
        array blockedDates "Datas bloqueadas"
        number maxSessionsPerDay "Capacidade diária"
        json automation "Configuração Evolution e n8n"
        json whatsappTemplates "Templates de disparo"
    }

    campaigns {
        string id PK
        string title "Nome da campanha"
        number bonusLevel1Percent "Bônus N1"
        number bonusLevel2Percent "Bônus N2"
        number bonusLevel3Percent "Bônus N3"
        boolean active "Vigência"
        timestamp startDate
        timestamp endDate
    }
```
