import { CheckCircle2, Info, XCircle, X } from "lucide-react";
import { useToastStore } from "../../store/toast";
import { cn } from "../../lib/utils";

const STYLES = {
  success: { icon: CheckCircle2, cls: "border-green-200 text-green-700" },
  info: { icon: Info, cls: "border-blue-200 text-blue-700" },
  error: { icon: XCircle, cls: "border-red-200 text-red-700" },
};

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
      {toasts.map((t) => {
        const { icon: Icon, cls } = STYLES[t.type] || STYLES.success;
        return (
          <div
            key={t.id}
            className={cn(
              "flex items-start gap-2.5 rounded-lg border bg-white px-4 py-3 shadow-lg animate-in slide-in-from-bottom-2 max-w-sm",
              cls
            )}
            role="status"
          >
            <Icon className="h-5 w-5 shrink-0 mt-0.5" />
            <p className="text-sm font-medium text-foreground flex-1">{t.message}</p>
            <button type="button" onClick={() => dismiss(t.id)} className="text-muted-foreground hover:text-foreground shrink-0">
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
