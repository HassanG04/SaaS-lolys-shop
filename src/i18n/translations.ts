// Named imports keep development-only kit copy out of production dictionaries.
import { theme as arTheme, ui as arUi, field as arField, search as arSearch } from './ar.json'
import { theme as enTheme, ui as enUi, field as enField, search as enSearch } from './en.json'

export const translations = {
  ar: { theme: arTheme, ui: arUi, field: arField, search: arSearch },
  en: { theme: enTheme, ui: enUi, field: enField, search: enSearch },
}
