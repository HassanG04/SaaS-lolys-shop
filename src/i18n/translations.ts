// Named imports keep development-only kit copy out of production dictionaries.
import {
  theme as arTheme,
  ui as arUi,
  field as arField,
  search as arSearch,
  nav as arNav,
  footer as arFooter,
} from './ar.json'
import {
  theme as enTheme,
  ui as enUi,
  field as enField,
  search as enSearch,
  nav as enNav,
  footer as enFooter,
} from './en.json'

export const translations = {
  ar: { theme: arTheme, ui: arUi, field: arField, search: arSearch, nav: arNav, footer: arFooter },
  en: { theme: enTheme, ui: enUi, field: enField, search: enSearch, nav: enNav, footer: enFooter },
}
