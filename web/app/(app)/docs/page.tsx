import { Assistant } from "@/components/assistant";
import { DocsView } from "@/components/docs-view";

export default function DocsPage() {
  return (
    <div className="h-full overflow-y-auto">
      <DocsView />
      <Assistant />
    </div>
  );
}
