import { useState } from "react";
import { useI18n } from "../i18n/I18nContext";
import { Button } from "../components/ui/button";
import { CalendarDays } from "lucide-react";
import KgScheduleEditor, { LEVEL_LABELS } from "../components/kg/KgScheduleEditor";

const LEVELS = [
  { id: "nursery", label: "Nursery" },
  { id: "lkg", label: "LKG" },
  { id: "ukg", label: "UKG" },
];

export default function KgSchedulePage() {
  const { t } = useI18n();
  const [level, setLevel] = useState("nursery");

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CalendarDays className="h-6 w-6 text-primary" /> {t("Early Years Schedule")}
        </h1>
        <p className="text-muted-foreground text-sm">
          {t("Nursery, LKG and UKG use their own timetable. Edit the times and activities, or mark a row for the whole week.")}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {LEVELS.map((l) => (
          <Button key={l.id} variant={level === l.id ? "default" : "outline"} onClick={() => setLevel(l.id)}>
            {t(LEVEL_LABELS[l.id] || l.label)}
          </Button>
        ))}
      </div>

      <KgScheduleEditor level={level} />
    </div>
  );
}