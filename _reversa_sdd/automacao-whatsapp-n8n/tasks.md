# Automação WhatsApp & n8n — Tarefas de Implementação (Tasks)

> Status: 🟢 CONFIRMADO (Plano Executável)
> Layout: Feature-Folder / Módulo

---

## Pré-requisitos
- [x] Webhook n8n ativo (`https://www.marcos9vinci.dedyn.io/webhook/indica-automacao`)
- [x] Instância da Evolution API (`wats`) pareada via QR Code

---

## Tarefas de Implementação

- [ ] **T-WTS-01:** Implementar o despachador com AbortController `sendViaN8n`
  - Origem: `src/lib/whatsappService.ts:50-91`
  - Critério de Pronto: Abortar após 4 segundos em caso de timeout de rede.
  - Confiança: 🟢

- [ ] **T-WTS-02:** Implementar o envio direto via Evolution API `sendDirectEvolution`
  - Origem: `src/lib/whatsappService.ts:93-132`
  - Critério de Pronto: Disparar requisição com header `apikey` para `/message/sendText/wats`.
  - Confiança: 🟢

- [ ] **T-WTS-03:** Implementar o analisador semântico `parseArtistIntent`
  - Origem: `src/lib/whatsappIntentParser.ts:1-206`
  - Critério de Pronto: Mapear números ("1", "2") e termos cotidianos para enums de decisão.
  - Confiança: 🟢

---

## Tarefas de Teste

- [ ] **TT-WTS-01:** Testar envio simulando n8n desligado (deve acionar Evolution API em exatamente 4 segundos e retornar `true`).
- [ ] **TT-WTS-02:** Testar interpolação de tags com template `{cliente}, seu horário é {horario}` (deve substituir corretamente).
