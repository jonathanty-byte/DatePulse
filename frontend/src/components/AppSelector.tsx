import { APPS } from "../lib/data";
import type { AppName } from "../lib/data";

interface AppSelectorProps {
  selected: AppName;
  onChange: (app: AppName) => void;
}

const APP_STYLES: Record<AppName, { border: string; text: string; bg: string; activeBg: string }> = {
  tinder: { border: "border-pink-300", text: "text-pink-500", bg: "bg-pink-50", activeBg: "bg-pink-500" },
  bumble: { border: "border-amber-300", text: "text-amber-600", bg: "bg-amber-50", activeBg: "bg-amber-500" },
  hinge: { border: "border-violet-300", text: "text-violet-600", bg: "bg-violet-50", activeBg: "bg-violet-500" },
  happn: { border: "border-orange-300", text: "text-orange-600", bg: "bg-orange-50", activeBg: "bg-orange-500" },
};

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function AppSelector({ selected, onChange }: AppSelectorProps) {
  return (
    <div className="flex gap-3">
      {APPS.map((app) => {
        const isActive = app === selected;
        const s = APP_STYLES[app];
        return (
          <button
            key={app}
            onClick={() => onChange(app)}
            className={`px-4 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-[13px] font-semibold tracking-wide transition-all active:scale-95 border ${
              isActive
                ? `${s.activeBg} text-white border-transparent shadow-sm`
                : `${s.bg} ${s.text} ${s.border} hover:shadow-sm`
            }`}
          >
            {capitalize(app)}
          </button>
        );
      })}
    </div>
  );
}
