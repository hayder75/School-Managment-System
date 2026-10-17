import { createContext, useContext, useState, useCallback, useMemo, useEffect } from "react";
import { en } from "./translations";

const I18nContext = createContext();

export function I18nProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem("sms_lang") || "en");
  // Amharic dictionary is loaded on demand so English users never download it.
  const [am, setAm] = useState(null);

  useEffect(() => {
    if (lang === "am" && !am) {
      import("./translations.am")
        .then((m) => setAm(m.am))
        .catch(() => {});
    }
  }, [lang, am]);

  const switchLang = useCallback((l) => {
    setLang(l);
    localStorage.setItem("sms_lang", l);
  }, []);

  const dict = lang === "am" ? am || en : en;

  const value = useMemo(() => {
    // Callable translator for flat phrases: t("Save") -> "አስቀምጥ"
    // Falls back to the English phrase when no translation exists, so pages
    // can be wrapped incrementally without breaking anything.
    const t = (phrase, vars) => {
      if (phrase === undefined || phrase === null) return "";
      let out = dict.phrases?.[phrase] ?? en.phrases?.[phrase] ?? phrase;
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          out = out.replace(new RegExp(`\\{${k}\\}`, "g"), v);
        }
      }
      return out;
    };
    // Also expose the namespaced dictionaries: t.common.save, t.nav.students...
    Object.assign(t, dict);
    return { lang, t, switchLang };
  }, [lang, switchLang, dict]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
