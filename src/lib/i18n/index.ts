export { en } from './locales/en'
export { so } from './locales/so'
export type { Translations } from './locales/en'

export type Language = 'en' | 'so'

export const LANGUAGES: Record<Language, string> = {
  en: 'English',
  so: 'Soomaali',
}
