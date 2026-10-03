# Galeria & Portfólio IA — Especificação de Requisitos (Requirements)

> Status: 🟢 CONFIRMADO (Extraído de `src/pages/GaleriaIA.tsx`, `src/constants/galeria.ts`)
> Layout: Feature-Folder / Módulo

---

## 1. Visão Geral
Estúdio de inteligência artificial voltado para a presença digital do estúdio e dos tatuadores. Automatiza a produção de conteúdo para redes sociais, roteiriza Reels com foco em conversão e integra com a Buffer API para publicação no Instagram.

---

## 2. Responsabilidades
- Gerenciar o pipeline de posts sociais nos estados `rascunho`, `pronto`, `agendado` e `publicado`.
- Gerar legendas e roteiros de Reels customizados para estilos de tattoo (Fineline, Realismo, etc.).
- Enfileirar posts na Buffer API.
- Apresentar visão de calendário de publicações semanal e trimestral.

---

## 3. Requisitos Funcionais

| ID | Requisito | MoSCoW | Critério de Aceite |
|---|---|:---:|---|
| **RF-GAL-01** | Visualizar posts organizados por status em abas interativas. | Must | Exibir cards coloridos com badges de status correspondentes. |
| **RF-GAL-02** | Gerar legendas e ganchos de vídeo com chamadas para ação do Indica Aí. | Should | A IA deve incluir o link ou código de convite no copy gerado. |
| **RF-GAL-03** | Agendar postagem externa conectando à fila da API do Buffer. | Should | Atualizar status do post para `agendado` com o ID da fila. |
