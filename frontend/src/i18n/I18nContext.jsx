import { createContext, useContext, useState, useCallback } from "react";
import { en, am } from "./translations";

const I18nContext = createContext();

export function I18nProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem("sms_lang") || "en");
  const t = lang === "am" ? am : en;

  const switchLang = useCallback((l) => {
    setLang(l);
    localStorage.setItem("sms_lang", l);
  }, []);

  return (
    <I18nContext.Provider value={{ lang, t, switchLang }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
