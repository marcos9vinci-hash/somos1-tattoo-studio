# Galeria & Portfólio IA — Design Técnico (Design)

> Status: 🟢 CONFIRMADO (Código Legado)
> Layout: Feature-Folder / Módulo

---

## 1. Interface & Tipos

```typescript
type PostStatus = 'rascunho' | 'pronto' | 'agendado' | 'publicado';

interface SocialPost {
  id: string;
  status: PostStatus;
  legenda: string;
  midiaUrl: string;
  estiloTatuagem?: string;
  bufferScheduleId?: string;
  dataPublicacao?: any;
}
```

---

## 2. Componentes e Fluxo de Agendamento
1. Usuário seleciona arte e estilo em `AnalisadorEstilo.tsx`.
2. `RoboSocialInstagram.tsx` sugere legendas e hashtags.
3. Ao clicar em "Aprovar Post", o status muda para `pronto`.
4. `BufferScheduleManager.tsx` despacha requisição para `https://api.bufferapp.com/1/updates/create.json`.
5. Post recebe `status = 'agendado'` e data de execução futura.
