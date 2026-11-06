import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, X } from "lucide-react";
import { useVault } from "@/lib/store";

export function FullAccessModal() {
  const open = useVault((s) => s.fullAccessModalOpen);
  const setOpen = useVault((s) => s.setFullAccessModalOpen);
  const reduceMotion = useReducedMotion() ?? false;

  function checkout() {
    window.open("https://buy.stripe.com/test_checkout", "_blank", "noopener,noreferrer");
    setOpen(false);
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Full access plan"
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md"
          onClick={() => setOpen(false)}
        >
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-md overflow-hidden rounded-xl border border-line bg-surface shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close modal"
              className="absolute right-3 top-3 z-30 rounded-lg p-1.5 text-muted transition-colors hover:bg-raised hover:text-fg"
            >
              <X className="size-4" />
            </button>

            {/* Vintage noisy project background with bottom fade */}
            <div className="relative h-48 w-full overflow-hidden border-b border-line/80 bg-bg">
              {/* Noise / Halftone SVG Pattern */}
              <svg
                className="absolute inset-0 size-full opacity-35 mix-blend-screen"
                xmlns="http://www.w3.org/2000/svg"
                width="100%"
                height="100%"
              >
                <filter id="noiseFilter">
                  <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch" />
                </filter>
                <rect width="100%" height="100%" filter="url(#noiseFilter)" />
              </svg>

              {/* Redacted text / data pattern overlay */}
              <div className="absolute inset-0 p-4 font-mono text-[10px] leading-loose tracking-wider text-faint select-none overflow-hidden opacity-40">
                <div>[[PERSON_1]] &middot; 34.0208&deg; N, 6.8416&deg; W &middot; [[EMAIL_1]]</div>
                <div>&gt; MASKED_STREAM_ACTIVE [0x9F82] --&gt; LOCAL_VAULT</div>
                <div>[[COMPANY_1]] &middot; SECURE_TUNNEL &middot; TOKEN_SWAP_OK</div>
                <div>[[CREDIT_CARD]] &middot; 192.168.1.105 &middot; ZERO_DATA_LEAK</div>
                <div>[[PHONE_1]] &middot; ENCRYPTED_ENDPOINT &middot; BYPASS_CLOUD</div>
              </div>

              {/* Fade to solid black gradient at bottom */}
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-surface/40 to-surface" />

              <div className="absolute bottom-4 left-6 z-10">
                <span className="rounded bg-lime/10 px-2 py-0.5 text-[10px] font-bold tracking-wider text-lime uppercase border border-lime/30">
                  Pro Workspace
                </span>
                <h2 className="mt-2 text-2xl font-bold tracking-tight text-fg">Relay Full Access</h2>
              </div>
            </div>

            {/* Content & Plan Details */}
            <div className="px-6 py-6 bg-surface">
              <p className="text-sm leading-relaxed text-muted">
                The professional workspace for developers and power users. Bring your own model keys and take complete control over your entity masking rules.
              </p>

              <ul className="mt-5 space-y-2.5 text-sm text-fg">
                <li className="flex items-center gap-3">
                  <Check className="size-4 text-lime shrink-0" />
                  <span>Complete control over what entities you anonymize &amp; custom masks</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="size-4 text-lime shrink-0" />
                  <span>Bring your own API keys (OpenAI, Anthropic, Gemini, Groq, xAI)</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="size-4 text-lime shrink-0" />
                  <span>Unlimited local-first passes &amp; vault sync</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="size-4 text-lime shrink-0" />
                  <span>Zero data retention &amp; private local storage</span>
                </li>
              </ul>

              {/* Price & CTA */}
              <div className="mt-8 flex items-center justify-between border-t border-line/80 pt-6">
                <div>
                  <div className="text-2xl font-bold text-fg">£100</div>
                  <div className="text-xs text-muted">per month, cancel anytime</div>
                </div>
                <button
                  type="button"
                  onClick={checkout}
                  className="rounded-lg bg-lime px-6 py-2.5 text-sm font-bold text-ink transition-opacity hover:opacity-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime"
                >
                  Upgrade via Stripe
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
