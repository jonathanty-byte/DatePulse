import { APPS } from "../lib/data";
import type { AppName } from "../lib/data";

interface AppSelectorProps {
  selected: AppName;
  onChange: (app: AppName) => void;
}

const APP_COLORS: Record<AppName, string> = {
  tinder: "from-orange-500 to-pink-500",
  bumble: "from-yellow-400 to-yellow-600",
  hinge: "from-gray-500 to-gray-700",
  happn: "from-orange-500 to-orange-700",
};

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function AppSelector({ selected, onChange }: AppSelectorProps) {
  return (
    <div className="flex gap-2">
      {APPS.map((app) => {
        const isActive = app === selected;
        return (
          <button
            key={app}
            onClick={() => onChange(app)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              isActive
                ? `bg-gradient-to-r ${APP_COLORS[app]} text-white shadow-lg`
                : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-gray-200"
            }`}
          >
            {capitalize(app)}
          </button>
        );
      })}
    </div>
  );
}
