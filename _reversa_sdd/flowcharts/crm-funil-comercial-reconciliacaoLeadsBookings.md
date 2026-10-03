# Fluxograma da Reconciliação: `leads`, `bookings` e `users`

> Gerado pelo Reversa Archaeologist em 2026-10-03 (Nível: Detalhado)
> Localização no código: `src/lib/crmService.ts` (`getLeads` linhas 39–224, `getClientes` linhas 292–430)
> Escala de Confiança: 🟢 CONFIRMADO

---

## 1. Problema Resolvido pelo Algoritmo

O sistema armazena agendamentos na coleção `bookings`, usuários cadastrados na coleção `users` e leads manuais/prospects na coleção `leads`.
Para evitar duplicações entre a **Agenda Oficial** e o **Funil Comercial**, o `crmService` executa um algoritmo em memória de reconciliação cruzada usando como chave primária o telefone normalizado (`replace(/\D/g, '')`).

---

## 2. Fluxograma de Reconciliação do `getLeads()`

```mermaid
flowchart TD
    Start(["Início: getLeads()"]) --> FetchData["Carrega coleções em paralelo:<br/>1. leads (Firestore)<br/>2. bookings (Firestore)<br/>3. users (Firestore)"]
    
    FetchData --> BuildPhoneMap["Cria userPhoneMap:<br/>userId -> user.phone"]
    
    BuildPhoneMap --> FilterBookings["Classifica Bookings por Data e Status:<br/>- Ativos/Futuros: date >= hoje e status != COMPLETED<br/>- Recentes Concluídos: date nos últimos 15 dias e status == COMPLETED"]
    
    FilterBookings --> MapLeadsManuais["Varre leads da coleção 'leads':<br/>Normaliza telefone (apenas dígitos)"]
    
    MapLeadsManuais --> CheckConflict{"Telefone do Lead manual<br/>já possui Booking Ativo?"}
    
    CheckConflict -- Sim --> SyncLeadWithBooking["Sincroniza estágio do lead manual:<br/>Se booking ativo -> força estagio = 'agendado'<br/>Atualiza data da sessão e artista"]
    CheckConflict -- Não --> CheckRecentBooking{"Telefone do Lead manual<br/>possui Booking Concluído <= 15d?"}
    
    CheckRecentBooking -- Sim --> SyncLeadPosVenda["Sincroniza estágio do lead manual:<br/>Força estagio = 'pos_venda'<br/>(Cicatrização)"]
    CheckRecentBooking -- Não --> KeepLeadManual["Mantém estágio manual do lead"]
    
    SyncLeadWithBooking --> MergeSyntheticBookings
    SyncLeadPosVenda --> MergeSyntheticBookings
    KeepLeadManual --> MergeSyntheticBookings
    
    MergeSyntheticBookings["Verifica Bookings Ativos e Recentes sem Lead Manual correspondente:<br/>Gera 'Lead Sintético' com ID 'booking_{id}'"]
    
    MergeSyntheticBookings --> ReturnFinalList["Retorna lista consolidada unificada:<br/>[...updatedLeadsManuais, ...leadsFromBookings]"]
    
    ReturnFinalList --> EndNode(["Fim"])
```

---

## 3. Isolamento e Regra de Ouro da Carteira

```
Clientes com sessões concluídas há mais de 15 dias são AUTOMATICAMENTE
omitidos do Funil Comercial e transferidos exclusivamente para a
CARTEIRA DE CLIENTES (Esteira de Temperatura), evitando poluição do kanban de vendas.
```
