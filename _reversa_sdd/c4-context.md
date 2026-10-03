# Diagrama C4 — Nível 1: Contexto do Sistema

> Gerado pelo Reversa Architect em 2026-10-03 (Nível: Detalhado)
> Escala de Confiança: 🟢 CONFIRMADO (Código e Infraestrutura)

---

## 1. Visão de Contexto

O SuperApp **Somos 1 / Indica Aí** posiciona-se no centro da operação do estúdio, conectando clientes, embaixadores, tatuadores e a gerência aos canais externos de WhatsApp, Redes Sociais e Banco de Dados em nuvem.

```mermaid
flowchart TD
    %% Personas
    Cliente["👤 Cliente / Usuário<br/>(Agenda sessões, acompanha cicatrização)"]
    Afiliado["🤝 Embaixador Indica Aí<br/>(Compartilha link, acumula créditos)"]
    Admin["👑 Dono do Estúdio / Admin<br/>(Gerencia agenda, funil CRM, finanças)"]
    Artista["🎨 Tatuador / Artista<br/>(Atende sessões, aprova horários via WhatsApp)"]

    %% Sistema Central
    SuperApp["🏛️ SuperApp Somos 1 / Indica Aí<br/>[React 19 + TypeScript + Vite + Tailwind 4]<br/>Plataforma Web & PWA / Capacitor Android"]

    %% Sistemas Externos
    Firestore["☁️ Firebase Firestore & Auth<br/>[BaaS Google]<br/>Persistência em tempo real e perfis"]
    Evolution["💬 Evolution API (WhatsApp Engine)<br/>[Node.js / Baileys]<br/>Disparo e leitura de mensagens no WhatsApp"]
    N8N["⚡ Webhooks n8n<br/>[Automação Workflow Engine]<br/>Cadências temporais e régua de contato"]
    BufferAPI["📱 Buffer API & Instagram Graph<br/>[Social Scheduler]<br/>Agendamento e publicação de mídia"]

    %% Relacionamentos
    Cliente -->|Usa via Web/Mobile| SuperApp
    Afiliado -->|Indica amigos e consulta saldo| SuperApp
    Admin -->|Opera CRM, grade e campanhas| SuperApp
    Artista -->|Aprova sessões e recebe alertas via WhatsApp| Evolution

    SuperApp -->|Lê e grava dados via SDK v11| Firestore
    SuperApp -->|Dispara mensagens diretas (fallback)| Evolution
    SuperApp -->|Envia eventos de gatilho com timeout 4s| N8N
    N8N -->|Orquestra disparos agendados| Evolution
    SuperApp -->|Agenda posts da Galeria IA| BufferAPI
    Evolution -->|Notifica tatuador e cliente| Artista
    Evolution -->|Entrega confirmações e lembretes| Cliente
```
