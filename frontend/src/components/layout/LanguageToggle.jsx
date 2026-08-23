import { useI18n } from "../../i18n/I18nContext";
import { Languages } from "lucide-react";

export default function LanguageToggle() {
  const { t, lang, switchLang } = useI18n();
  return (
    <div className="flex items-center rounded-full border bg-background p-0.5 mr-3">
      <Languages size={13} className="text-muted-foreground ml-1.5" />
      {["en", "am"].map((l) => (
        <button
          key={l}
          onClick={() => switchLang(l)}
          className={`px-2 py-0.5 rounded-full text-[11px] font-semibold transition-colors cursor-pointer ${
            lang === l ? "bg-neutral-900 text-white" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {l === "en" ? t.auth.english : t.auth.amharic}
        </button>
      ))}
    </div>
  );
}
