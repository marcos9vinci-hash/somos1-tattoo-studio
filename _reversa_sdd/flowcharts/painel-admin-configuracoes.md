# Fluxograma — Painel Admin & Configurações (Somos 1 / Indica Aí)

> Gerado pelo Reversa Archaeologist em 2026-10-03 (Nível: Detalhado)
> Escala de Confiança: 🟢 CONFIRMADO (Extraído de `src/pages/Admin.tsx`, `src/types.ts`)

---

## 1. Arquitetura Modular do Painel Administrativo

O painel centraliza todas as operações do estúdio com isolamento por `ModuleErrorBoundary`:

```mermaid
flowchart TD
    AdminAuth["🔐 Auth Check: isAdmin == true?"] --> CheckPerm{"Permissão Válida?"}
    
    CheckPerm -- Não --> Deny["Acesso Negado / Redireciona para Home"]
    CheckPerm -- Sim --> AdminHub["🏛️ SuperApp Admin Hub"]
    
    subgraph Modulos["5 Pilares Administrativos"]
        AdminHub --> ModAgenda["📅 Módulo Agenda & CRM<br/>(Calendar, CRM Kanban, Horários, Membros)"]
        AdminHub --> ModIndica["🚀 Módulo Indica Aí<br/>(Dashboard, Créditos, Campanhas, Convites, Árvore)"]
        AdminHub --> ModStudio["🎨 Módulo Studio & Tatuadores<br/>(Tattoo Engine, Artistas, Portfólios)"]
        AdminHub --> ModGaleria["✨ Módulo Galeria IA<br/>(Agendador de Mídia, Reels, Tendências)"]
        AdminHub --> ModSystem["⚙️ Módulo Sistema & Mensageria<br/>(Evolution API, n8n, Templates, Logs)"]
    end
```

---

## 2. Fluxo de Ajuste e Auditoria de Créditos Manuais

```mermaid
flowchart TD
    SelectUser["Seleciona Usuário na Lista"] --> InputAmount["Informa Valor e Motivo da Transação"]
    InputAmount --> ExecMutation["creditService.addCreditTransaction()"]
    
    ExecMutation --> UpdateBalance["1. Atualiza users/{uid}:<br/>creditsBalance += valor"]
    UpdateBalance --> LogAudit["2. Grava transactions:<br/>type = ADMIN_ADJUSTMENT<br/>description = motivo informado"]
    LogAudit --> SendPush["3. Grava notifications:<br/>type = CREDIT_RECEIVED / SYSTEM"]
    SendPush --> EndAudit(["Transação Efetivada com Auditoria"])
```
