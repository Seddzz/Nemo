"use client";

import { BookOpen, Circle, FileUp, MessageSquare, Plus, Search, Settings, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import FluidOrb from "@/components/ui/fluid-orb";
import { emptyConversation } from "@/lib/chat";
import { cn } from "@/lib/utils";

import { useApp, type Conversation } from "./app-context";

function groupConversations(list: Conversation[]): [string, Conversation[]][] {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const today: Conversation[] = [];
  const older: Conversation[] = [];

  for (const conversation of list) {
    (conversation.createdAt >= startOfDay.getTime() ? today : older).push(conversation);
  }

  const groups: [string, Conversation[]][] = [];
  if (today.length) groups.push(["Today", today]);
  if (older.length) groups.push(["Older", older]);
  return groups;
}

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { conversations, activeId, setActiveId, setConversations, openSettings } = useApp();
  const pathname = usePathname();
  const router = useRouter();
  const [query, setQuery] = useState("");

  const groups = useMemo(() => {
    const term = query.trim().toLowerCase();
    const filtered = term
      ? conversations.filter((conversation) => conversation.title.toLowerCase().includes(term))
      : conversations;
    return groupConversations(filtered);
  }, [conversations, query]);

  function startChat() {
    const conversation = emptyConversation();
    setConversations((previous) => [conversation, ...previous]);
    setActiveId(conversation.id);
    setQuery("");
    onClose();
    router.push("/chat");
  }

  function openChat(id: string) {
    setActiveId(id);
    onClose();
    router.push("/chat");
  }

  const nav = [
    { href: "/", label: "Anonymize", icon: FileUp },
    { href: "/chat", label: "Chat", icon: MessageSquare },
    { href: "/docs", label: "Docs", icon: BookOpen },
  ];

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-[70] flex w-[264px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-transform duration-200 ease-out lg:static lg:translate-x-0",
        open ? "translate-x-0" : "-translate-x-full",
      )}
    >
      <div className="flex items-center gap-2.5 px-3 pt-4 pb-2">
        <span className="orb-halo flex size-[26px] items-center justify-center">
          <FluidOrb size={24} color="#c8ff00" />
        </span>
        <Link
          href="/"
          onClick={onClose}
          className="font-brand text-[15px] tracking-[0.06em] text-foreground"
        >
          NEMO
        </Link>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close sidebar"
          className="ml-auto inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-sidebar-accent hover:text-foreground lg:hidden"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="px-3">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search chatsâ€¦"
            aria-label="Search chats"
            className="h-8 w-full rounded-lg border border-sidebar-border bg-background/50 pr-2 pl-8 text-[12.5px] text-foreground outline-none placeholder:text-muted-foreground/70 focus:border-primary/40"
          />
        </div>
      </div>

      <div className="px-3 pt-2">
        <button
          type="button"
          onClick={startChat}
          className="flex h-8 w-full items-center gap-2 rounded-lg border border-sidebar-border bg-background/40 px-2.5 text-[12.5px] font-medium text-foreground transition-colors hover:border-primary/40 hover:text-primary"
        >
          <Plus className="size-3.5" />
          New chat
        </button>
      </div>

      <nav className="mt-3 flex flex-col gap-0.5 px-2">
        {nav.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                "flex h-8 items-center gap-2.5 rounded-lg px-2.5 text-[12.5px] transition-colors",
                active
                  ? "bg-sidebar-accent text-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
              )}
            >
              <Icon className={cn("size-3.5", active && "text-primary")} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="no-scrollbar mt-2 min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {groups.length === 0 ? (
          <p className="px-2.5 py-3 text-[12px] text-muted-foreground/70">
            {query ? "No matches." : "No chats yet."}
          </p>
        ) : (
          groups.map(([label, items]) => (
            <div key={label} className="mb-3 flex flex-col gap-0.5">
              <div className="px-2.5 pb-1 text-[10px] font-semibold tracking-[0.09em] text-muted-foreground/60 uppercase">
                {label}
              </div>
              {items.map((conversation) => (
                <button
                  key={conversation.id}
                  type="button"
                  onClick={() => openChat(conversation.id)}
                  className={cn(
                    "flex h-8 items-center gap-2 rounded-lg px-2.5 text-left text-[12.5px] transition-colors",
                    conversation.id === activeId
                      ? "bg-sidebar-accent text-foreground"
                      : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
                  )}
                >
                  <Circle className="size-2 shrink-0 opacity-50" />
                  <span className="truncate">{conversation.title}</span>
                </button>
              ))}
            </div>
          ))
        )}
      </div>

      <div className="border-t border-sidebar-border p-2">
        <button
          type="button"
          onClick={() => {
            openSettings();
            onClose();
          }}
          className="flex h-8 w-full items-center gap-2.5 rounded-lg px-2.5 text-[12.5px] text-muted-foreground transition-colors hover:bg-sidebar-accent/60 hover:text-foreground"
        >
          <Settings className="size-3.5" />
          Settings
        </button>
        <div className="flex items-center justify-between px-2.5 pt-2">
          <a
            href="https://rareui.com"
            target="_blank"
            rel="noreferrer"
            className="text-[10.5px] text-muted-foreground/60 transition-colors hover:text-primary"
          >
            Orb by Rare UI
          </a>
          <span className="text-[10.5px] text-muted-foreground/40">v0.1.0</span>
        </div>
      </div>
    </aside>
  );
}
