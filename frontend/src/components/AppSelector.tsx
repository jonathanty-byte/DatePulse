/**
 * App selection tabs (Tinder, Bumble, Hinge, Happn).
 */

interface AppSelectorProps {
  apps: string[];
  selected: string;
  onChange: (app: string) => void;
}

const APP_COLORS: Record<string, string> = {
  tinder: "bg-gradient-to-r from-orange-500 to-pink-500",
  bumble: "bg-yellow-500",
  hinge: "bg-gray-700",
  happn: "bg-orange-600",
};

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function AppSelector({
  apps,
  selected,
  onChange,
}: AppSelectorProps) {
  return (
    <div className="flex gap-2">
      {apps.map((app) => {
        const isActive = app === selected;
        return (
          <button
            key={app}
            onClick={() => onChange(app)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              isActive
                ? `${APP_COLORS[app] || "bg-brand-600"} text-white shadow-lg`
                : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200"
            }`}
          >
            {capitalize(app)}
          </button>
        );
      })}
    </div>
  );
}
