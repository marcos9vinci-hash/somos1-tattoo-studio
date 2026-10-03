# Inventário Geral do Sistema — Somos 1 / Indica Aí

> Gerado pelo **Reversa Scout** em 03/10/2026 às 11:03:50.

## 1. Visão Geral da Superfície

- **Total de Arquivos:** 262
- **Total Estimado de Linhas de Código:** ~53.963
- **Framework Base:** Vite + React 19 + TypeScript + Tailwind CSS 4
- **Backend / BaaS:** Firebase Firestore (db: `ai-studio-dcd3cc7e-f58b-453b-a948-88e194766ac9`) + Express Node.js (`server.js` / `api/`)
- **Mensageria & Automação:** Evolution API (`wats`) + n8n Webhook
- **Hospedagem & Deploy:** Vercel (Produção automática a partir de `main` no GitHub)

## 2. Contagem por Extensão de Arquivo

| Extensão | Quantidade de Arquivos |
|---|---|
| `.tsx` | 114 |
| `.ts` | 56 |
| `.png` | 22 |
| `.cjs` | 21 |
| `.json` | 10 |
| `.xml` | 9 |
| `.js` | 6 |
| `sem_extensao` | 5 |
| `.html` | 2 |
| `.txt` | 2 |
| `.md` | 2 |
| `.mp4` | 2 |
| `.css` | 2 |
| `.example` | 1 |
| `.local` | 1 |
| `.iml` | 1 |
| `.rules` | 1 |
| `.toml` | 1 |
| `.sh` | 1 |
| `.ico` | 1 |
| `.mjs` | 1 |
| `.py` | 1 |

## 3. Módulos de Negócio Identificados

### 🔹 CRM & Funil Comercial
- **Caminhos:** `src/components/crm, src/lib/crmService.ts, src/pages/CRMDashboardPage.tsx`
- **Responsabilidade:** Funil duplo de leads e carteira por temperatura pós-tattoo

### 🔹 Indica Aí (Afiliados & Recomendações)
- **Caminhos:** `src/lib/referralUtils.ts, src/types/referral.ts, src/pages/Network.tsx`
- **Responsabilidade:** Sistema de comissionamento multinível por indicação

### 🔹 Agenda & Booking
- **Caminhos:** `src/lib/bookingService.ts, src/pages/Agenda.tsx`
- **Responsabilidade:** Gestão de horários, sessões e bloqueio de slots

### 🔹 Automação WhatsApp & n8n
- **Caminhos:** `src/lib/whatsappService.ts, api/agentService.js`
- **Responsabilidade:** Disparos via Evolution API, webhook n8n e IA conversacional

### 🔹 Galeria & Portfólio
- **Caminhos:** `src/pages/Gallery.tsx, src/pages/Portfolio.tsx`
- **Responsabilidade:** Vitrine de artes, flashes e referências do estúdio

### 🔹 Painel Admin & Configurações
- **Caminhos:** `src/pages/Admin.tsx, src/types/studioSettings.ts`
- **Responsabilidade:** Gestão geral, regras de estúdio, taxas e comissões

## 4. Entry Points da Aplicação

- `index.html`
- `src/main.tsx`
- `src/App.tsx`
- `server.js`
- `api/agentService.js`
