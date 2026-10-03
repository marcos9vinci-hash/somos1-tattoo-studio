# Matriz de Permissões e Segurança (RBAC) — Somos 1 / Indica Aí

> Gerado pelo Reversa Detective em 2026-10-03 (Nível: Detalhado)
> Escala de Confiança: 🟢 CONFIRMADO (Código)

---

## 1. Papéis de Usuário no Sistema (`UserRole`)

- **`user` (Cliente / Afiliado):** Acesso à área pública, agendamento de sessões, visualização de flashes da galeria, árvore unilevel de indicados e saldo de créditos.
- **`admin` (Gestor / Dono do Estúdio):** Acesso completo ao painel de controle operacional, configurações de agenda, Kanban duplo de CRM, campanhas WhatsApp, gestão de usuários e concessão/estorno de créditos.
- **`artist` (Tatuador — papel em evolução):** Responde via WhatsApp / Co-Piloto para aprovar ou reagendar sessões através de mensagens e transcrições de áudio.

---

## 2. Matriz de Acesso a Funcionalidades

| Funcionalidade / Rota | Papel `user` | Papel `admin` | Regra de Verificação no Código |
|---|:---:|:---:|---|
| **Ver Perfil & Saldo de Créditos** | ✅ | ✅ | `profile.uid` do usuário autenticado |
| **Solicitar Novo Agendamento** | ✅ | ✅ | `Booking.tsx` (exige autenticação) |
| **Abater Créditos em Tattoo (até 50%)** | ✅ | ✅ | `src/pages/Booking.tsx:121` |
| **Acessar Rede de Afiliados (Árvore Indica Aí)** | ✅ | ✅ | `src/pages/Network.tsx` |
| **Compartilhar Código de Convite** | ✅ | ✅ | `profile.inviteCode` |
| **Acessar `/admin` (SuperApp Hub)** | ❌ | ✅ | `isAdmin` (validado em `src/pages/Admin.tsx:81`) |
| **Aprovar / Rejeitar / Reagendar Sessões** | ❌ | ✅ | Modal `DetalhesAgendamentoModal.tsx` |
| **Configurar Grade e Slots de Horários** | ❌ | ✅ | `AgendaScheduleSettingsModal.tsx` |
| **Mover Leads no Kanban de Vendas** | ❌ | ✅ | `LeadKanbanBoard.tsx` |
| **Disparar Campanhas em Massa no WhatsApp** | ❌ | ✅ | `Somos1ClientesKanban.tsx` |
| **Conceder ou Estornar Créditos Manuais** | ❌ | ✅ | `creditService.addCreditTransaction` (`ADMIN_ADJUSTMENT`) |
| **Alterar Chaves da Evolution API / n8n** | ❌ | ✅ | `WhatsAppAutomationModal.tsx` |
| **Publicar e Agendar Posts no Buffer** | ❌ | ✅ | `BufferScheduleManager.tsx` |

---

## 3. Segurança no Acesso a Dados (Firestore Rules)
- Acesso a coleções sensíveis (`studio_settings`, `campaigns`, `transactions` tipo `ADMIN_ADJUSTMENT`) restrito a documentos de usuário com `role == 'admin'`.
- Deduplicação de clientes baseada em sanitização de número telefônico para impedir vazamento cruzado de histórico.
