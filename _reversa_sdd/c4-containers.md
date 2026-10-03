# Diagrama C4 — Nível 2: Containers do Sistema

> Gerado pelo Reversa Architect em 2026-10-03 (Nível: Detalhado)
> Escala de Confiança: 🟢 CONFIRMADO (Código e Arquitetura)

---

## 1. Visão de Containers

O SuperApp é decomposto em contêineres lógicos e serviços de suporte que viabilizam a operação full-stack:

```mermaid
flowchart TD
    subgraph ClientSide["Frontend & Mobile Layer"]
        SPA["🌐 Single Page Application (SPA)<br/>[React 19, TypeScript, Vite, Tailwind CSS 4]<br/>Executada no navegador do usuário"]
        Mobile["📱 Mobile Wrapper<br/>[Capacitor Android]<br/>Empacotamento nativo com suporte a deep links"]
    end

    subgraph BackendServices["Backend & API Layer"]
        LocalServer["⚙️ Local Node Server<br/>[Express 4.21, server.js]<br/>Endpoints locais e co-piloto IA"]
        AgentService["🤖 Agent Service API<br/>[api/agentService.js]<br/>Orquestração de prompts e personas NAIA"]
    end

    subgraph DataStorage["Data & State Persistence"]
        FirestoreDB[("🔥 Firebase Firestore<br/>[NoSQL Document DB]<br/>Coleções: users, bookings, leads, transactions")]
        FirebaseAuth["🔑 Firebase Authentication<br/>[OAuth / Phone / Email Auth]<br/>Gestão de sessões e tokens JWT"]
        LocalStorage["💾 Browser LocalStorage<br/>[Web Storage API]<br/>Cache de preferências e drafts da Galeria"]
    end

    subgraph Integrations["External Cloud Automation"]
        N8nServer["⚡ n8n Workflow Server<br/>[dedyn.io]<br/>Roteamento com delays e webhooks"]
        EvolutionVPS["💬 Evolution API VPS<br/>[code.run / Baileys]<br/>Conexão direta de socket com WhatsApp"]
    end

    %% Ligações
    SPA <-->|Capacitor Bridge| Mobile
    SPA -->|HTTPS / SDK Firestore| FirestoreDB
    SPA -->|Auth State Observer| FirebaseAuth
    SPA -->|R/W| LocalStorage
    SPA -->|REST Calls| LocalServer
    LocalServer --> AgentService
    SPA -->|POST Webhooks (4s timeout)| N8nServer
    SPA -.->|POST Fallback Direto| EvolutionVPS
    N8nServer -->|HTTP POST| EvolutionVPS
```
