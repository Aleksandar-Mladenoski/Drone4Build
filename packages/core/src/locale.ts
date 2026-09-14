export type Messages = Record<string, string>;

export function resolveLocale(): string {
  if (typeof window === 'undefined') return 'en';
  const query = new URLSearchParams(window.location.search).get('lang');
  return (query || document.documentElement.lang || 'en').toLowerCase().split('-')[0];
}

export function createTranslator(en: Messages, dictionaries: Record<string, Messages> = {}) {
  const locale = resolveLocale();
  const selected = dictionaries[locale] || en;
  function t(key: string, values: Record<string, string | number> = {}): string {
    const template = selected[key] ?? en[key] ?? `[${key}]`;
    return template.replace(/\{(\w+)\}/g, (_, name: string) => String(values[name] ?? `{${name}}`));
  }
  return { t, locale };
}
