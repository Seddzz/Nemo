import type { ReactNode } from "react";

import { CodeBlock } from "@/components/code-block";

export type DocSection = {
  id: string;
  group: string;
  label: string;
  title: string;
  subtitle: string;
  toc: { id: string; label: string }[];
  body: ReactNode;
};

const INSTALL = `python -m venv .venv

# Windows
.venv\\Scripts\\pip install -e ".[dev]" \\
  --index-url https://download.pytorch.org/whl/cpu \\
  --extra-index-url https://pypi.org/simple

# macOS / Linux
.venv/bin/pip install -e ".[dev]" \\
  --index-url https://download.pytorch.org/whl/cpu \\
  --extra-index-url https://pypi.org/simple`;

const RUN_API = `# Windows
.venv\\Scripts\\uvicorn anonymizer.api:app --reload

# macOS / Linux
.venv/bin/uvicorn anonymizer.api:app --reload`;

const ENTITY_JSON = `{
  "label": "EMAIL",
  "start": 6,
  "end": 13,
  "text": "a@b.com",
  "score": 1.0,
  "source": "regex"
}`;

const ANON_REQUEST = `curl -X POST http://localhost:8000/anonymize \\
  -H "Content-Type: application/json" \\
  -d '{"text": "Email a@b.com from John Doe",
       "strategy": "placeholder", "ner": true}'`;

const ANON_RESPONSE = `{
  "redacted": "Email [EMAIL_1] from [PERSON_1]",
  "entities": [
    {"label": "EMAIL", "start": 6, "end": 13, "text": "a@b.com",
     "score": 1.0, "source": "regex"},
    {"label": "PERSON", "start": 19, "end": 27, "text": "John Doe",
     "score": 0.99, "source": "ner"}
  ]
}`;

const DOCKER = `# Build the CPU-only image
docker build -t anonymizer-api .

# Run it
docker run --rm -p 8000:8000 anonymizer-api

# Or with compose
docker compose up --build`;

const WEB = `# terminal 1 — engine (repo root)
.venv\\Scripts\\uvicorn anonymizer.api:app --reload

# terminal 2 — web app
cd web
npm install
npm run dev`;

const CLI = `# Fake entities (default), FR/EN, auto locale
.venv\\Scripts\\python -m anonymizer.cli "Karim El Amrani habite 12 rue Hassan II, oujda."

# Numbered placeholders, no model download
.venv\\Scripts\\python -m anonymizer.cli --strategy placeholder --no-ner "CIN AB123456"

# JSON with entity spans
cat document.txt | .venv\\Scripts\\python -m anonymizer.cli --json`;

const EVAL = `# Synthetic docs, regex + checksum detectors
python -m eval.run -n 200 --seed 0

# Include the OpenMed model (downloads ~2.8 GB into .hf-cache on first run)
python -m eval.run -n 200 --seed 0 --ner`;

export const SECTIONS: DocSection[] = [
  {
    id: "introduction",
    group: "Getting started",
    label: "Introduction",
    title: "Introduction",
    subtitle: "Local, one-way PII anonymization for French and English text",
    toc: [
      { id: "what", label: "What it does" },
      { id: "pipeline", label: "The pipeline" },
      { id: "strategies", label: "Redaction strategies" },
    ],
    body: (
      <>
        <p>
          <strong>Nemo</strong> finds personally identifiable information in French and English
          documents and replaces it with placeholders or fakes. Everything runs locally — no text
          leaves your machine unless you choose to send it somewhere, and no mapping is ever kept:
          redaction is one-way on purpose.
        </p>
        <div className="callout">
          <span>
            <strong>Scope:</strong> French and English text (Arabic is deferred). The NER model is{" "}
            <code>OpenMed/privacy-filter-multilingual-v2</code>; context and phone rules cover
            French/Moroccan formats; checksums are international.
          </span>
        </div>

        <h2 id="what">What it does</h2>
        <ul>
          <li>Detects emails, French/Moroccan and US phones, ZIP codes and dates with regex.</li>
          <li>Pins labelled ICE, CIN, RIB, IBAN, street and organisation spans with context rules.</li>
          <li>Validates IBANs, card numbers, SIREN, SIRET and NIR with checksums.</li>
          <li>Finds names, organisations, addresses and locations with a multilingual NER model.</li>
          <li>Redacts with stable placeholders or realistic fake values (CLI, API or web app).</li>
          <li>Keeps no history: redacted text is the only artifact.</li>
        </ul>

        <h2 id="pipeline">The pipeline</h2>
        <p>
          Every detector returns the same <code>Entity</code> shape, so results merge cleanly.
          Overlapping spans are resolved by trust:{" "}
          <strong>context beats checksum beats regex beats NER</strong>, then longer spans win, then
          higher confidence.
        </p>
        <CodeBlock label="Entity" code={ENTITY_JSON} />

        <h2 id="strategies">Redaction strategies</h2>
        <ul>
          <li>
            <strong>placeholder</strong> — <code>[PERSON_1]</code>, numbered per label and reused
            for repeated values.
          </li>
          <li>
            <strong>fake</strong> — realistic surrogates such as a new name, email or IBAN, so the
            document stays readable.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "installation",
    group: "Getting started",
    label: "Installation",
    title: "Installation",
    subtitle: "Python 3.11+, CPU-only PyTorch, one command",
    toc: [
      { id: "install", label: "Install" },
      { id: "serve", label: "Serve the API" },
      { id: "web", label: "Web app" },
    ],
    body: (
      <>
        <p>
          The package uses a <code>src/</code> layout. Install it in editable mode with the CPU
          build of PyTorch so you do not pull the multi-gigabyte CUDA wheel.
        </p>
        <h2 id="install">Install</h2>
        <CodeBlock label="Shell" code={INSTALL} />
        <h2 id="serve">Serve the API</h2>
        <p>
          Start FastAPI with Uvicorn. Interactive docs are served at{" "}
          <code>/docs</code> and the OpenAPI schema at <code>/openapi.json</code>.
        </p>
        <CodeBlock label="Shell" code={RUN_API} />
        <h2 id="web">Web app</h2>
        <p>
          The UI is a Next.js app in <code>web/</code>. It talks to the engine on{" "}
          <code>http://localhost:8000</code> and runs entirely on your machine. The default route is
          the upload page; chat and docs live in the same shell.
        </p>
        <CodeBlock label="Shell" code={WEB} />
      </>
    ),
  },
  {
    id: "detection",
    group: "Concepts",
    label: "Detection",
    title: "Detection",
    subtitle: "Regex, checksums and NER working together",
    toc: [
      { id: "regex", label: "Regex detectors" },
      { id: "checksum", label: "Checksum detectors" },
      { id: "ner", label: "NER detector" },
      { id: "overlaps", label: "Overlap resolution" },
    ],
    body: (
      <>
        <p>
          A <code>DetectionEngine</code> runs a list of detectors and merges their output into
          non-overlapping <code>Entity</code> spans.
        </p>
        <h2 id="regex">Regex detectors</h2>
        <table className="api">
          <thead>
            <tr>
              <th>Label</th>
              <th>Matches</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>EMAIL</td>
              <td>Standard user@domain.tld addresses.</td>
            </tr>
            <tr>
              <td>PHONE</td>
              <td>
                US, French and Moroccan formats: <code>(555) 123-4567</code>,{" "}
                <code>+33 6 12 34 56 78</code>, <code>+212 6 61 23 45 67</code>.
              </td>
            </tr>
            <tr>
              <td>ZIP</td>
              <td><code>12345</code>, <code>12345-6789</code>, French five-digit codes.</td>
            </tr>
            <tr>
              <td>DATE</td>
              <td><code>03/15/2024</code>, <code>March 15, 2024</code>, <code>15 March 2024</code>.</td>
            </tr>
          </tbody>
        </table>

        <h2 id="checksum">Checksum detectors</h2>
        <ul>
          <li><strong>IBAN</strong> — ISO 7064 mod-97.</li>
          <li><strong>CARD</strong> — Luhn, 13–19 digits, with an embedded-number guard so a card fragment inside an IBAN/RIB is rejected.</li>
          <li><strong>SIREN / SIRET</strong> — Luhn-validated French company identifiers.</li>
          <li><strong>NIR</strong> — French social security number, including Corsica and overseas.</li>
        </ul>
        <p>
          A <strong>context</strong> layer sits above these for labelled identifiers — ICE, CIN,
          RIB, IBAN, street addresses, neighbourhoods and organizations — so a label wins over a
          fragment detected inside it.
        </p>

        <h2 id="ner">NER detector</h2>
        <p>
          <code>NerDetector</code> wraps <code>OpenMed/privacy-filter-multilingual-v2</code>, a
          1.4B-parameter multilingual model with 217 BIOES labels. A custom decoder, span snap and
          merge pass reconstruct full names, addresses, dates, emails and phones; labels are
          canonicalized to <code>PERSON</code>, <code>ADDRESS</code>, <code>ORGANIZATION</code>,{" "}
          <code>ZIP</code>, <code>CARD</code> and friends. Long documents are windowed (512 tokens,
          64 overlap), and a second pass on title-cased text recovers lowercase names. The model
          downloads on first use into <code>.hf-cache/</code> and in the API it is opt-in via{" "}
          <code>ner: true</code>.
        </p>

        <h2 id="overlaps">Overlap resolution</h2>
        <p>
          When two entities overlap, the higher-ranked one wins: source priority first
          (<code>context</code> &gt; <code>checksum</code> &gt; <code>regex</code> &gt;{" "}
          <code>ner</code>), then span length, then score.
        </p>
      </>
    ),
  },
  {
    id: "anonymization",
    group: "Concepts",
    label: "Anonymization",
    title: "Anonymization",
    subtitle: "Stable placeholders or realistic fakes",
    toc: [
      { id: "placeholder", label: "Placeholders" },
      { id: "fake", label: "Fake values" },
      { id: "dedup", label: "Repeated values" },
    ],
    body: (
      <>
        <p>
          <code>anonymize_text(text, entities, strategy)</code> replaces each entity span and
          returns the redacted text. Redaction is one-way: no mapping is kept, returned or stored.
        </p>
        <h2 id="placeholder">Placeholders</h2>
        <p>
          The default strategy numbers placeholders per label: <code>[EMAIL_1]</code>,{" "}
          <code>[EMAIL_2]</code>, <code>[PERSON_1]</code>. Brackets make them unambiguous and easy
          to spot when reading the redacted output.
        </p>
        <h2 id="fake">Fake values</h2>
        <p>
          Pass <code>strategy=&quot;fake&quot;</code> to swap in realistic surrogates using Faker
          — new names, emails, IBANs and card numbers, so the document stays readable.
        </p>
        <h2 id="dedup">Repeated values</h2>
        <p>
          The same <code>(label, value)</code> pair always gets the same replacement, so{" "}
          <code>John met John</code> becomes <code>[PERSON_1] met [PERSON_1]</code>, which keeps
          the document&apos;s relationships intact.
        </p>
      </>
    ),
  },
  {
    id: "api",
    group: "Interfaces",
    label: "REST API",
    title: "REST API",
    subtitle: "Five endpoints, JSON in and out",
    toc: [
      { id: "endpoints", label: "Endpoints" },
      { id: "anonymize", label: "Anonymize" },
      { id: "files", label: "Files" },
      { id: "cors", label: "CORS" },
    ],
    body: (
      <>
        <p>
          The API is a FastAPI app served by Uvicorn on port <code>8000</code>. This build has no
          authentication; put it behind your own gateway if you expose it publicly.
        </p>
        <h2 id="endpoints">Endpoints</h2>
        <table className="api">
          <thead>
            <tr>
              <th>Method</th>
              <th>Path</th>
              <th>Purpose</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><span className="method get">GET</span></td>
              <td>/health</td>
              <td>Liveness check.</td>
            </tr>
            <tr>
              <td><span className="method post">POST</span></td>
              <td>/detect</td>
              <td>Return entities without changing the text.</td>
            </tr>
            <tr>
              <td><span className="method post">POST</span></td>
              <td>/anonymize</td>
              <td>Redact text and return the redacted copy.</td>
            </tr>
          </tbody>
        </table>

        <h2 id="anonymize">Anonymize</h2>
        <p>
          Body: <code>text</code> (required), <code>strategy</code> (
          <code>placeholder</code> or <code>fake</code>) and <code>ner</code> (default{" "}
          <code>false</code>). Set <code>ner: true</code> to include the OpenMed transformer
          detector; the ~2.8 GB model downloads into <code>.hf-cache/</code> on the first request
          and is cached afterwards.
        </p>
        <CodeBlock label="Request" code={ANON_REQUEST} />
        <CodeBlock label="Response" code={ANON_RESPONSE} />

        <h2 id="files">Files</h2>
        <p>
          <code>/detect-file</code> and <code>/anonymize-file</code> accept multipart uploads of{" "}
          <code>.txt</code> and <code>.pdf</code> (up to 10 MB). With <code>output=pdf</code> the{" "}
          <code>/anonymize-file</code> streams a redacted PDF back with the PII boxed out in place.
        </p>

        <h2 id="cors">CORS</h2>
        <p>
          Allowed origins come from <code>ANONYMIZER_CORS_ORIGINS</code> (comma-separated) and
          default to <code>http://localhost:3000</code> for local development.
        </p>
      </>
    ),
  },
  {
    id: "cli",
    group: "Interfaces",
    label: "CLI",
    title: "CLI",
    subtitle: "Text in, rewritten text out",
    toc: [
      { id: "usage", label: "Usage" },
      { id: "flags", label: "Flags" },
    ],
    body: (
      <>
        <p>
          The CLI runs the same detection engine as the API and writes the rewritten text to
          stdout. Fake entities are the default; pass <code>--strategy placeholder</code> for
          numbered tokens. Omit the text argument to read stdin.
        </p>
        <h2 id="usage">Usage</h2>
        <CodeBlock label="Shell" code={CLI} />
        <h2 id="flags">Flags</h2>
        <ul>
          <li><code>--no-ner</code> — regex/checksum/context only, no model download.</li>
          <li><code>--json</code> — output <code>{`{"redacted": "...", "entities": [...]}`}</code>.</li>
          <li><code>--seed</code> — reproducible fake values.</li>
          <li><code>--locale auto|en_US|fr_FR</code> — fake-value locale (default auto).</li>
          <li><code>--min-score</code> — NER confidence threshold (default 0.5).</li>
          <li><code>--include-labels</code> / <code>--exclude-labels</code> — override the NER label policy.</li>
          <li><code>--no-second-pass</code> — disable the lowercase-name pass.</li>
        </ul>
      </>
    ),
  },
  {
    id: "web-app",
    group: "Interfaces",
    label: "Web app",
    title: "Web app",
    subtitle: "Anonymize, chat and docs in one local shell",
    toc: [
      { id: "routes", label: "Routes" },
      { id: "settings", label: "Settings" },
    ],
    body: (
      <>
        <p>
          Run the engine and the web app side by side. The app is local-first: uploads go to the
          engine on your machine, and chat history and settings stay in the browser.
        </p>
        <h2 id="routes">Routes</h2>
        <ul>
          <li>
            <code>/</code> — upload a <code>.txt</code> or <code>.pdf</code> and get a redacted copy.
          </li>
          <li>
            <code>/chat</code> — ask Nemo about redaction; the status card shows the latest
            redaction.
          </li>
          <li>
            <code>/docs</code> — this documentation.
          </li>
        </ul>
        <h2 id="settings">Settings</h2>
        <p>
          Display name, engine URL, Groq API key and model are stored in <code>localStorage</code>.
          The API key is sent per request and never persisted server-side.
        </p>
      </>
    ),
  },
  {
    id: "docker",
    group: "Interfaces",
    label: "Docker",
    title: "Docker",
    subtitle: "One container, CPU-only PyTorch",
    toc: [
      { id: "run", label: "Build and run" },
    ],
    body: (
      <>
        <p>
          The image installs PyTorch from the CPU index, so it stays small and needs no GPU. The
          API listens on <code>0.0.0.0:8000</code>.
        </p>
        <h2 id="run">Build and run</h2>
        <CodeBlock label="Shell" code={DOCKER} />
        <div className="callout">
          <span>
            On Windows, Docker Desktop&apos;s CLI may not be on <code>PATH</code>; call it from{" "}
            <code>%LOCALAPPDATA%\\Programs\\DockerDesktop\\resources\\bin</code> or start Docker
            Desktop first.
          </span>
        </div>
      </>
    ),
  },
  {
    id: "evaluation",
    group: "Quality",
    label: "Evaluation",
    title: "Evaluation",
    subtitle: "Synthetic data and precision/recall/F1",
    toc: [
      { id: "generator", label: "Dataset generator" },
      { id: "metrics", label: "Metrics" },
    ],
    body: (
      <>
        <p>
          The evaluation harness generates English documents with known PII spans, runs the
          detection engine, and reports micro-averaged precision, recall and F1.
        </p>
        <h2 id="generator">Dataset generator</h2>
        <p>
          <code>DatasetGenerator</code> fills templates with valid values — Luhn-checked card
          numbers, checksum-valid IBANs, US phone/ZIP/date formats — and records exact offsets.
        </p>
        <h2 id="metrics">Metrics</h2>
        <CodeBlock label="Shell" code={EVAL} />
        <p>
          The regex + checksum pipeline scores 1.000 on this synthetic set by construction; the
          interesting signal appears when NER is enabled or real documents are used.
        </p>
      </>
    ),
  },
  {
    id: "limitations",
    group: "Quality",
    label: "Limitations",
    title: "Limitations",
    subtitle: "What this build does not do yet",
    toc: [
      { id: "model", label: "Model behaviour" },
      { id: "coverage", label: "Coverage" },
      { id: "operations", label: "Operations" },
    ],
    body: (
      <>
        <h2 id="model">Model behaviour</h2>
        <ul>
          <li>
            Lowercase names are weak; the second pass title-cases text and recovers many of them
            (<code>karim el amrani</code> becomes <code>PERSON</code>), but it is not a guarantee.
          </li>
          <li>
            Known quirks: <code>Atlas Conseil SARL</code> is missed by NER (the organization
            context rule covers it), <code>quartier Al Qods</code> and{" "}
            <code>12 rue Hassan II</code> split into fragments (the address rules cover them).
          </li>
          <li>
            Long documents are windowed at 512 tokens with 64 overlap; a span exactly on a seam can
            still split.
          </li>
          <li>NER is probabilistic; context, checksum and regex are deterministic and take priority.</li>
          <li>Arabic is deferred; the supported languages are French and English.</li>
        </ul>
        <h2 id="coverage">Coverage</h2>
        <ul>
          <li>
            Phone rules cover US, French and Moroccan formats; street/neighbourhood/ICE/CIN/RIB
            context rules cover Moroccan documents.
          </li>
          <li>PDF redaction needs a real text layer; scanned or image-only PDFs are rejected.</li>
          <li>Fake surrogates could coincidentally match unrelated text elsewhere.</li>
        </ul>
        <h2 id="operations">Operations</h2>
        <ul>
          <li>Redaction is one-way; nothing is stored server-side between requests.</li>
          <li>There is no authentication or rate limiting in this build.</li>
          <li>
            The web app and engine run as two local processes; there is no bundled installer yet.
          </li>
        </ul>
      </>
    ),
  },
];

export const GROUPS = ["Getting started", "Concepts", "Interfaces", "Quality"];
