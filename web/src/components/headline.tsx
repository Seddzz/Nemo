import { useEffect, useState } from "react";
import { Search } from "lucide-react";

export function CipherHeadline({ className = "" }: { className?: string }) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setPhase((current) => (current + 1) % 4);
    }, 1600);
    return () => window.clearInterval(id);
  }, []);

  // Magnifying glass sweeps left→right over "John", revealing "brahim".
  const positions = [0, 50, 100, 50];

  return (
    <h1 className={className}>
      <span className="inline-flex items-baseline gap-2">
        <span>Hello</span>
        <span className="relative inline-block">
          <span className="relative z-10 text-lime">John!</span>
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 z-20 overflow-hidden text-fg"
            style={{
              clipPath: `circle(18px at ${positions[phase]}% 50%)`,
              transition: "clip-path 900ms cubic-bezier(0.22, 1, 0.36, 1)",
            }}
          >
            brahim!
          </span>
          <span
            aria-hidden
            className="pointer-events-none absolute z-30"
            style={{
              left: `calc(${positions[phase]}% - 14px)`,
              top: "50%",
              transform: "translateY(-50%)",
              transition: "left 900ms cubic-bezier(0.22, 1, 0.36, 1)",
            }}
          >
            <Search className="size-7 text-fg/80" strokeWidth={2.5} />
          </span>
        </span>
      </span>
    </h1>
  );
}
