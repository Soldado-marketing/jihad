export type SupportedLocale = 'ar' | 'en' | 'de';
export type TextDirection = 'rtl' | 'ltr';

export function getDirection(locale: SupportedLocale): TextDirection {
  return locale === 'ar' ? 'rtl' : 'ltr';
}

export function getDocumentLanguage(locale: SupportedLocale): string {
  return locale;
}

export function getDirectionalClass(locale: SupportedLocale): string {
  return getDirection(locale) === 'rtl' ? 'direction-rtl' : 'direction-ltr';
}
