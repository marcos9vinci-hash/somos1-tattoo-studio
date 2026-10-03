# Fluxograma — Galeria & Portfólio IA (Somos 1 / Indica Aí)

> Gerado pelo Reversa Archaeologist em 2026-10-03 (Nível: Detalhado)
> Escala de Confiança: 🟢 CONFIRMADO (Extraído de `src/pages/GaleriaIA.tsx`, `src/constants/galeria.ts`)

---

## 1. Visão Geral do Estúdio de Conteúdo IA

O módulo GaleriaIA atua como o hub de marketing, geração de mídia e presença digital para o estúdio:

```mermaid
flowchart TD
    Estudio["✨ Estúdio IA (Geração de Conteúdo)"] --> Ideacao["1. Ideação & Análise de Estilo<br/>(AnalisadorEstilo.tsx)"]
    Ideacao --> Scripts["2. Roteirização<br/>(ScriptReels.tsx & StorySequencer.tsx)"]
    Scripts --> Trends["3. Músicas & Áudios em Alta<br/>(AudiosEmAlta.tsx)"]
    
    Trends --> StatusMachine["4. Máquina de Estados do Post:<br/>rascunho -> pronto -> agendado -> publicado"]
    
    StatusMachine --> Schedule["5. Enfileiramento & Agendamento<br/>(BufferScheduleManager.tsx)"]
    Schedule --> Publish["6. Publicação no Instagram"]
    Publish --> Analytics["7. Coleta de Métricas & Retenção<br/>(InstagramInsights.tsx)"]
    Analytics --> Ideacao
```

---

## 2. Estados Operacionais do Post

| Status | Cor / Indicador | Significado |
|---|---|---|
| `rascunho` | Amarelo | Post em criação/edição visual |
| `pronto` | Azul | Aprovado pelo tatuador / estúdio |
| `agendado` | Índigo (pulsante) | Enfileirado no Buffer / Scheduler |
| `publicado` | Verde | Publicado com sucesso no feed/stories |
