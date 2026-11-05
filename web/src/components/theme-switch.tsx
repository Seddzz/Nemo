import { Moon, Sun } from "lucide-react";
import { setTheme, toggleTheme, useTheme } from "@/lib/theme";

const OPTIONS = [
  { value: "dark", label: "Dark", Icon: Moon },
  { value: "light", label: "Light", Icon: Sun },
] as const;

export function ThemeSwitch({ className = "" }: { className?: string }) {
  const theme = useTheme();

  return (
    <div
      role="group"
      aria-label="Theme"
      className={`flex items-center gap-0.5 rounded-md border border-line p-0.5 ${className}`}
    >
      {OPTIONS.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          onClick={() => setTheme(value)}
          aria-pressed={theme === value}
          aria-label={`${label} theme`}
          title={`${label} theme`}
          className={`rounded-[4px] p-1 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime ${
            theme === value ? "bg-raised text-fg" : "text-faint hover:text-fg"
          }`}
        >
          <Icon className="size-3.5" />
        </button>
      ))}
    </div>
  );
}

export function ThemeToggleButton() {
  const theme = useTheme();
  const Icon = theme === "dark" ? Sun : Moon;
  const label = theme === "dark" ? "Switch to light mode" : "Switch to dark mode";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      className="rounded-md p-2 text-muted transition-colors hover:text-lime focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime"
    >
      <Icon className="size-4" />
    </button>
  );
}
