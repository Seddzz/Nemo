import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/docs")({ component: Documentation });

const SECTIONS = [
  {
    n: "01",
    title: "What this is",
    body: "This is a desk between you and a model you already use. You write normally. Before a request is formed, emails, phone numbers, card numbers, dates, street addresses and likely names are replaced with stable tokens such as [[PERSON_1]].",
  },
  {
    n: "02",
    title: "What never leaves",
    body: "The map from token to original lives in this browser. The relay sends only the anonymized transcript. If you turn restoration on, tokens in the reply are swapped back after the response arrives — on your machine, not on theirs.",
  },
  {
    n: "03",
    title: "The key",
    body: "Under Settings, paste a provider credential. It is stored locally and attached only to the request you send. Without a key, Relay still anonymizes and then stops. Nothing is invented on your behalf.",
  },
  {
    n: "04",
    title: "Limits",
    body: "Detection is heuristic, not a medical or legal guarantee. Unusual names, nicknames, and context (“my sister’s school”) can slip through. Read the “leaves the machine” column before you download or send.",
  },
  {
    n: "05",
    title: "Files",
    body: "Anonymize accepts pasted text and plain files — .txt, .md, .csv, .json. The download is the anonymized text only. Originals are not uploaded anywhere by this page.",
  },
];

function Documentation() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl px-6 py-12 md:px-10 md:py-16">
        <p className="text-[11px] text-faint">Documentation</p>
        <h1 className="mt-2 text-2xl text-fg">How the layer works</h1>
        <div className="mt-12">
          {SECTIONS.map((s) => (
            <section key={s.n} className="grid gap-3 border-t border-line py-8 sm:grid-cols-[4rem_1fr]">
              <div className="text-[11px] text-faint">{s.n}</div>
              <div>
                <h2 className="text-base text-fg">{s.title}</h2>
                <p className="mt-3 text-sm leading-relaxed text-muted">{s.body}</p>
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
