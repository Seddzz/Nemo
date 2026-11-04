# Deployment

Nemo is local-first: the engine runs on your machine (Python, the CLI console, or
Docker), while the web app deploys to Vercel. The web app redacts text in the
browser before anything is sent, and never talks to the engine.

```
Browser (redacts locally) ──► web app on Vercel ──► your model provider
Terminal ──► CLI console ──► detection engine (local)
```

## 1. Engine

Run it whichever way suits your workflow — no public host required:

```bash
# Python (editable install)
.venv\Scripts\uvicorn anonymizer.api:app --reload        # http://localhost:8000/docs

# or Docker (rebuilds on start)
docker compose up --build                                # API on :8000

# or skip the server entirely: the terminal console
anon                                                     # or: nemo
```

If you self-host the API on a container platform (Render, Railway, Fly.io, Hugging
Face Spaces), the NER model (`dslim/bert-base-NER`) downloads on first use, so give
the container about 2 GB of memory.

## 2. Web app (Vercel)

Import the repository into Vercel and set the **root directory** to `web`.

The app is TanStack Start on Vite. `npm run build` uses Nitro's Vercel preset to write
`.vercel/output`, which Vercel deploys as-is, so no framework preset or extra settings
are needed.

No environment variables are required. Each user pastes their own provider key on the
**Key** page (OpenAI, Anthropic, Google Gemini, Groq, xAI Grok, or any OpenAI-compatible
URL). The key is stored in that user's browser and sent, with the redacted transcript
only, through the app's server function to the provider.

## Local development

```bash
# Engine
.venv\Scripts\uvicorn anonymizer.api:app --reload        # http://localhost:8000

# Web app
cd web
npm install
npm run dev                                              # http://localhost:3000
npm run typecheck && npm run lint && npm run build       # checks before pushing
```

The dashboard starts with synthetic sample data; switch it off with the **Sample data**
toggle to see your own usage.
