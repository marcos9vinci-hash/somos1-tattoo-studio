/**
 * iaCache — Cache de resultados de IA em sessionStorage
 * Dura enquanto a aba do navegador estiver aberta.
 * Não persiste imagens — só os resultados textuais gerados.
 */

const PREFIX = "galeria_ia_cache_";
const TTL_MS = 30 * 60 * 1000; // 30 minutos

interface CacheEntry<T> {
  value: T;
  expires: number;
}

/** Gera uma chave curta a partir de uma string (URL, base64, config...) */
export function hashKey(input: string, maxLen = 80): string {
  // Usa os primeiros 40 + últimos 40 chars como fingerprint barato
  const s = input.replace(/\s+/g, "");
  if (s.length <= maxLen) return s;
  return s.slice(0, 40) + s.slice(-40);
}

export function cacheGet<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const entry: CacheEntry<T> = JSON.parse(raw);
    if (Date.now() > entry.expires) {
      sessionStorage.removeItem(PREFIX + key);
      return null;
    }
    return entry.value;
  } catch {
    return null;
  }
}

export function cacheSet<T>(key: string, value: T, ttlMs = TTL_MS): void {
  try {
    const entry: CacheEntry<T> = { value, expires: Date.now() + ttlMs };
    sessionStorage.setItem(PREFIX + key, JSON.stringify(entry));
  } catch (e) {
    // Falha silenciosa (ex: modo privado sem sessionStorage)
    console.warn("[iaCache] Falha ao salvar cache:", e);
  }
}

export function cacheInvalidate(key: string): void {
  try {
    sessionStorage.removeItem(PREFIX + key);
  } catch {}
}

export function cacheClear(): void {
  try {
    const keys = Object.keys(sessionStorage).filter(k => k.startsWith(PREFIX));
    keys.forEach(k => sessionStorage.removeItem(k));
  } catch {}
}
