# Documento de Arquitetura do Sistema — Somos 1 / Indica Aí

> Gerado pelo Reversa Architect em 2026-10-03 (Nível: Detalhado)
> Escala de Confiança: 🟢 CONFIRMADO (Código e Infraestrutura)

---

## 1. Visão Geral Executiva
O **Somos 1 / Indica Aí** é um SuperApp vertical para estúdios de tatuagem de alta performance, unificando em uma única base de código:
- **Funil Comercial & CRM:** Captação de novos clientes via WhatsApp/Instagram e esteira de retenção pós-tattoo (Carteira por Temperatura).
- **Motor de Afiliados (Indica Aí):** Marketing Member-Get-Member com rede recursiva unilevel de 3 níveis (10%, 5%, 2.5% de cashback).
- **Agenda Oficial & Gestão de Slots:** Agendamento com cálculo dinâmico de horários e trava de segurança de abatimento com créditos (máximo 50%).
- **Automação WhatsApp & Co-Piloto IA:** Canal duplo resiliente (n8n primário com fallback automático para Evolution API direta) e parser semântico de intenções.
- **Estúdio de Conteúdo IA (Galeria):** Geração de mídia social, roteiros para Reels e agendamento via Buffer.
- **Painel de Governança Administrativa:** RBAC estrito, isolamento por `ModuleErrorBoundary` e auditoria transacional imutável.

---

## 2. Pilha Tecnológica (Tech Stack)

| Camada | Tecnologia | Justificativa / Papel |
|---|---|---|
| **Frontend UI** | React 19 + TypeScript + Vite | Interface reativa moderna, rápida e tipada |
| **Estilização** | Tailwind CSS 4 + Lucide Icons + Motion | Design responsivo com tokens visuais e microinterações |
| **Persistência / BaaS** | Firebase Firestore (`memorizeai-7b8fd`) | NoSQL em tempo real, sem necessidade de infraestrutura pesada |
| **Autenticação** | Firebase Auth (Email/Senha/Telefone) | Sessões seguras com tokens JWT e controle de papéis |
| **Mobile Native** | Capacitor 7 (Android) | Distribuição mobile mantendo a mesma base web |
| **Mensageria WhatsApp** | Evolution API + Baileys | Conexão socket estável com a rede do WhatsApp |
| **Workflow Engine** | Webhooks n8n (`dedyn.io`) | Orquestração de delays e cadências de automação |
| **Social API** | Buffer Publish API | Agendamento programado de posts no feed/stories |

---

## 3. Matriz de Integrações Externas

| Sistema Externo | Tipo / Protocolo | Endpoint / Destino | SLA / Resiliência |
|---|---|---|---|
| **n8n Webhook** | HTTP POST (JSON) | `https://www.marcos9vinci.dedyn.io/webhook/indica-automacao` | Timeout de 4s com AbortController |
| **Evolution API** | HTTP POST (JSON) | `https://p01--evolution--6n2dx6dsdlsf.code.run/message/sendText/wats` | Fallback imediato do n8n |
| **Firebase Firestore** | gRPC / HTTPS | Projeto `memorizeai-7b8fd` | SDK Oficial com offline persistence |
| **Buffer API** | REST HTTPS | `https://api.bufferapp.com/1/updates/create.json` | Fila de agendamento assíncrona |

---

## 4. Dívidas Técnicas Identificadas & Recomendações
1. **Deduplicação de Leads por Telefone em Memória:** O método `crmService.getLeads()` carrega documentos de coleções inteiras e executa deduplicação no cliente. Recomenda-se criar um índice composto ou uma Cloud Function no Firestore para manter um documento agregador indexado por telefone.
2. **Uso de `@ts-nocheck` em Serviços Críticos:** Arquivos como `whatsappService.ts` e `whatsappBatchScanner.ts` possuem tipagem desativada em alguns pontos. Recomenda-se tipar estritamente os payloads da Evolution API.
