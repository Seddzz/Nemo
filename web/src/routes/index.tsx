import { createFileRoute, Link } from "@tanstack/react-router";
import { Composer } from "@/components/composer";
import { useVault } from "@/lib/store";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const documents = useVault((s) => s.documents);
  const entities = useVault((s) => s.entities);
  const messagesRouted = useVault((s) => s.messagesRouted);

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-1 flex-col items-center justify-center px-6 pb-10">
        <p className="mt-5 max-w-md text-center text-sm leading-relaxed text-muted">
          Ask a question, paste a note, or point at a file. Sensitive spans are stripped before
          anything reaches your model.
        </p>
        <p className="mt-6 text-center text-xs text-faint">
          {documents} documents · {entities} entities held · {messagesRouted} messages
        </p>
        <Link to="/dashboard" className="mt-3 text-xs text-muted underline-offset-4 hover:underline">
          Open dashboard
        </Link>
      </div>
      <div className="mx-auto w-full max-w-3xl px-4 pb-6">
        <Composer />
      </div>
    </div>
  );
}
