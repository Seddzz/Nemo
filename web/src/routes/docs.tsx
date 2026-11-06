import { createFileRoute } from "@tanstack/react-router";
import {
  Check,
  Compass,
  Copy,
  KeyRound,
  RefreshCw,
  Server,
  ShieldCheck,
  UserRound,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { MarkMoney } from "@/components/marks";

export const Route = createFileRoute("/docs")({ component: HowItWorks });

type NavItem = { id: string; label: string; icon: LucideIcon | typeof MarkMoney };

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Overview",
    items: [
      { id: "overview", label: "The idea", icon: Compass },
      { id: "flow", label: "The flow", icon: Workflow },
    ],
  },
  {
    label: "Process",
    items: [
      { id: "device", label: "Your device", icon: UserRound },
      { id: "layer", label: "Anonymization layer", icon: ShieldCheck },
      { id: "api", label: "Your model API", icon: Server },
      { id: "restore", label: "Reply restoration", icon: RefreshCw },
    ],
  },
  {
    label: "Access",
    items: [
      { id: "full-access", label: "Full access", icon: MarkMoney },
      { id: "the-key", label: "The key", icon: KeyRound },
    ],
  },
];

const ALL_ITEMS = NAV_GROUPS.flatMap((group) => group.items);
const SECTION_IDS = ALL_ITEMS.map((item) => item.id);

const PROCESS = [
  {
    id: "device",
    title: "Your device",
    body: "You write or drop a file into Relay. The original stays here; only the masked copy is ever put into a request.",
  },
  {
    id: "layer",
    title: "Anonymization layer",
    body: "Names, emails, phone numbers, card numbers, dates and street addresses are detected and replaced with stable tokens. The token-to-original map never leaves this browser.",
  },
  {
    id: "api",
    title: "Your model API",
    body: "Your own provider key is attached to the request. The model receives the tokenized transcript, so it never sees the originals.",
  },
  {
    id: "restore",
    title: "Reply restoration",
    body: "The reply comes back with tokens intact. Relay swaps them for the originals locally before showing it to you. Turn restoration off in Settings if you want to read the masked reply.",
  },
];

const SECTIONS = [
  {
    id: "full-access",
    title: "Full access",
    body: "The free workspace covers local anonymization, file passes and chats with your own key. Full access is the paid workspace for heavier use; start it from “Get full access” in the main sidebar.",
  },
  {
    id: "the-key",
    title: "The key",
    body: "Under Settings, paste a credential for any of the providers we support — OpenAI, Anthropic, Google, Groq, xAI, or any OpenAI-compatible endpoint. It is stored locally and attached only to the request you send. Without a key, Relay still anonymizes and then stops.",
  },
];

function HowItWorks() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { active, select } = useActiveSection(scrollRef);
  const [copied, setCopied] = useState(false);

  async function copyPage() {
    const text = [
      "How it works — Relay",
      "A layer between you and your model.",
      "Relay anonymizes your text before it leaves this device and restores tokens in the reply after it comes back.",
      window.location.href,
    ].join("\n\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked */
    }
  }

  return (
    <div className="flex h-full min-h-0">
      <aside className="hidden w-56 shrink-0 border-r border-line/70 lg:block">
        <div className="nice-scroll h-full overflow-y-auto">
          <DocsSidebar active={active} onSelect={select} />
        </div>
      </aside>

      <div ref={scrollRef} className="nice-scroll min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl px-6 py-10 md:px-10 md:py-14">
          <MobileNav active={active} onSelect={select} />

          <header id="overview" className="scroll-mt-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[11px] font-medium tracking-wide text-lime uppercase">
                  How it works
                </p>
                <h1 className="mt-2 text-3xl tracking-tight text-fg md:text-4xl">
                  A layer between you and your model
                </h1>
                <p className="mt-3 text-base text-muted">
                  Anonymize on the way out. Restore on the way back.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void copyPage()}
                className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-line bg-surface/60 px-3 py-2 text-[13px] text-fg transition-colors hover:bg-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime"
              >
                {copied ? (
                  <Check className="size-3.5 text-lime" />
                ) : (
                  <Copy className="size-3.5 text-muted" />
                )}
                {copied ? "Copied" : "Copy page"}
              </button>
            </div>
            <p className="mt-6 max-w-2xl text-[15px] leading-relaxed text-muted">
              Relay sits in the middle. Your text is anonymized before it leaves this device, and
              the reply is restored only after it comes back.
            </p>
          </header>

          <section id="flow" className="scroll-mt-6 pt-12">
            <h2 className="text-xl tracking-tight text-fg">The flow</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
              Your request crosses the layer masked. The provider’s reply crosses back with its
              tokens swapped for the originals — locally, before you see it.
            </p>

            <FlowCanvas />
          </section>

          <section className="pt-12">
            <h2 className="text-xl tracking-tight text-fg">The process</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
              Four stops between the text you write and the reply you read.
            </p>
            <div className="mt-4 divide-y divide-line/60 border-y border-line/60">
              {PROCESS.map((step) => (
                <div
                  key={step.id}
                  id={step.id}
                  className="scroll-mt-6 grid gap-2 py-6 sm:grid-cols-[13rem_1fr] sm:gap-6"
                >
                  <h3 className="text-sm font-medium text-fg">{step.title}</h3>
                  <p className="text-sm leading-relaxed text-muted">{step.body}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="pt-12">
            <h2 id="access" className="scroll-mt-6 text-xl tracking-tight text-fg">
              Access
            </h2>
            <div className="mt-6">
              {SECTIONS.map((s) => (
                <div key={s.id} id={s.id} className="scroll-mt-6 border-t border-line py-8">
                  <h3 className="text-base text-fg">{s.title}</h3>
                  <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">{s.body}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function useActiveSection(rootRef: React.RefObject<HTMLDivElement | null>) {
  const [active, setActive] = useState(SECTION_IDS[0]);
  const locked = useRef<string | null>(null);

  const select = (id: string) => {
    locked.current = id;
    setActive(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    let frame = 0;
    const compute = () => {
      // A click selection holds until you scroll again, so trailing sections stay lit.
      if (locked.current) return;
      if (root.scrollTop + root.clientHeight >= root.scrollHeight - 8) {
        setActive(SECTION_IDS[SECTION_IDS.length - 1]);
        return;
      }
      const line = root.getBoundingClientRect().top + 120;
      let current = SECTION_IDS[0];
      for (const id of SECTION_IDS) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= line) current = id;
      }
      setActive(current);
    };
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        compute();
      });
    };
    const release = () => {
      locked.current = null;
    };

    compute();
    root.addEventListener("scroll", onScroll, { passive: true });
    root.addEventListener("wheel", release, { passive: true });
    root.addEventListener("touchmove", release, { passive: true });
    root.addEventListener("pointerdown", release);
    window.addEventListener("keydown", release);
    window.addEventListener("resize", onScroll);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      root.removeEventListener("scroll", onScroll);
      root.removeEventListener("wheel", release);
      root.removeEventListener("touchmove", release);
      root.removeEventListener("pointerdown", release);
      window.removeEventListener("keydown", release);
      window.removeEventListener("resize", onScroll);
    };
  }, [rootRef]);

  return { active, select };
}

function DocsSidebar({ active, onSelect }: { active: string; onSelect: (id: string) => void }) {
  return (
    <nav aria-label="On this page" className="px-3 py-10">
      {NAV_GROUPS.map((group, index) => (
        <div key={group.label} className={index > 0 ? "mt-6" : ""}>
          <p className="px-2 pb-2 text-[10px] font-bold tracking-[0.14em] text-faint uppercase">
            {group.label}
          </p>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const Icon = item.icon;
              const on = active === item.id;
              return (
                <li key={item.id}>
                  <a
                    href={`#${item.id}`}
                    aria-current={on ? "location" : undefined}
                    onClick={(event) => {
                      event.preventDefault();
                      onSelect(item.id);
                    }}
                    className={`group flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] font-bold outline-none transition-colors ${
                      on ? "text-fg" : "text-muted hover:bg-raised/60 hover:text-fg"
                    }`}
                  >
                    <Icon
                      className={`nav-icon size-4 ${on ? "text-lime" : ""}`}
                      strokeWidth={1.75}
                    />
                    <span className="truncate">{item.label}</span>
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function MobileNav({ active, onSelect }: { active: string; onSelect: (id: string) => void }) {
  return (
    <nav
      aria-label="Sections"
      className="nice-scroll -mx-6 mb-8 flex gap-1 overflow-x-auto border-b border-line/70 px-6 pb-3 lg:hidden"
    >
      {ALL_ITEMS.map((item) => {
        const on = active === item.id;
        return (
          <a
            key={item.id}
            href={`#${item.id}`}
            onClick={(event) => {
              event.preventDefault();
              onSelect(item.id);
            }}
            className={`shrink-0 rounded-md px-2.5 py-1.5 text-[12px] font-bold transition-colors ${
              on ? "text-fg" : "text-muted hover:text-fg"
            }`}
          >
            {item.label}
          </a>
        );
      })}
    </nav>
  );
}

function FlowCanvas() {
  return (
    <div
      className="mt-6 w-full rounded-2xl border border-line/70 bg-bg/50 p-4 md:p-6"
      style={{
        backgroundImage: "radial-gradient(var(--color-line) 1px, transparent 1px)",
        backgroundSize: "22px 22px",
      }}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch relative">
        {/* Node 1: You / Device */}
        <div className="relative flex flex-col justify-between rounded-xl border border-line/80 bg-surface p-4 shadow-sm">
          <div>
            <div className="flex items-center justify-between border-b border-line/70 pb-2.5 mb-3">
              <span className="text-xs font-bold text-fg">You</span>
              <span className="inline-flex items-center gap-1 rounded-[5px] border border-line bg-raised px-1.5 py-0.5 text-[10px] text-muted">
                <UserRound className="size-3" />
                Device
              </span>
            </div>
            <p className="text-[11px] leading-relaxed text-fg">
              Patient <span className="text-lime">Yasmine Benali</span> lives at 14 Rue des Orangers,
              Casablanca. She works at Attijariwafa Bank.
            </p>
          </div>
          <div className="mt-4 pt-2.5 border-t border-line/40 flex items-center justify-between text-[10px] text-faint">
            <span>Input: plain text</span>
            <span>Local only</span>
          </div>
        </div>

        {/* Node 2: Anonymizer Engine */}
        <div className="relative flex flex-col justify-between rounded-xl border border-line bg-surface p-4 shadow-sm ring-1 ring-lime/25">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded bg-raised px-2 py-0.5 text-[9px] font-bold tracking-[0.14em] text-lime uppercase border border-line">
            Engine
          </div>
          <div>
            <div className="flex items-center justify-between border-b border-line/70 pb-2.5 mb-3">
              <span className="text-xs font-bold text-fg">Anonymizer</span>
              <span className="inline-flex items-center gap-1 rounded-[5px] border border-line bg-raised px-1.5 py-0.5 text-[10px] text-lime">
                <ShieldCheck className="size-3 text-lime" />
                Local Vault
              </span>
            </div>
            <p className="text-[11px] leading-relaxed text-fg">
              Patient{" "}
              <span className="group/token inline cursor-default">
                <span className="text-muted group-hover/token:hidden">[[PERSON_1]]</span>
                <span className="hidden text-lime group-hover/token:inline">Yasmine Benali</span>
              </span>{" "}
              lives at <span className="text-muted">[[ADDRESS_1]]</span>,{" "}
              <span className="text-muted">[[CITY_1]]</span>. She works at{" "}
              <span className="text-muted">[[COMPANY_1]]</span>.
            </p>
          </div>
          <div className="mt-4 pt-2.5 border-t border-line/40 flex items-center justify-between text-[10px] text-faint">
            <span>Masks &amp; restores</span>
            <span>Browser memory</span>
          </div>
        </div>

        {/* Node 3: Your API */}
        <div className="relative flex flex-col justify-between rounded-xl border border-line/80 bg-surface p-4 shadow-sm">
          <div>
            <div className="flex items-center justify-between border-b border-line/70 pb-2.5 mb-3">
              <span className="text-xs font-bold text-fg">Your API</span>
              <span className="inline-flex items-center gap-1 rounded-[5px] border border-line bg-raised px-1.5 py-0.5 text-[10px] text-muted">
                <Server className="size-3" />
                Provider
              </span>
            </div>
            <p className="text-[11px] leading-relaxed text-fg">
              Appointment noted for Yasmine Benali. I’ve saved 14 Rue des Orangers and will send the
              reminders.
            </p>
          </div>
          <div className="mt-4 pt-2.5 border-t border-line/40 flex items-center justify-between text-[10px] text-faint">
            <span>Receives: tokens only</span>
            <span>BYO Key</span>
          </div>
        </div>
      </div>

      {/* Flow direction indicator bar */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-6 border-t border-line/60 pt-3 text-[10px] tracking-wider text-faint uppercase">
        <span className="flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-lime" />
          Outgoing: your text → anonymized tokens
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-muted" />
          Returning: model reply → restored locally
        </span>
      </div>
    </div>
  );
}
