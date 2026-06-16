import { createContext, useContext, useState } from 'react'
import translations from '../i18n'

const LanguageContext = createContext()

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem('cecum_lang') || 'es')

  const changeLang = (l) => {
    setLang(l)
    localStorage.setItem('cecum_lang', l)
  }

  const t = (key) => translations[lang]?.[key] ?? translations['es'][key] ?? key

  return (
    <LanguageContext.Provider value={{ lang, changeLang, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export const useLanguage = () => useContext(LanguageContext)
