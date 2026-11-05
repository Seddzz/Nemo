# Nemo

Local-first chat wall for anonymizing documents and texts. Paste text or upload a file, get an anonymized version back. De-detection restores the original values locally. Everything runs in the browser — nothing leaves your machine.

## What you get

- **Chat wall** — send messages and files through your own model key; PII is replaced with stable tokens before anything is sent.
- **Direct upload** — drop a `.txt` file (or paste text) and download the anonymized copy.
- **De-detection** — swap tokens back to original values in replies, locally, after the model responds.
- **Document text processing** — read and anonymize text files client-side.
- **Local-first** — detection and redaction happen in this browser. Your API key stays in local storage.

## Install

### Engine (Python)

```bash
git clone https://github.com/Seddzz/Nemo.git
cd Nemo
uv sync
```

### Web app (localhost)

```bash
cd web
npm install
npm run dev                         # http://localhost:3000
```

## Docker

```bash
docker build -t nemo-web ./web
docker run -p 3000:3000 nemo-web
```

The app is available at `http://localhost:3000`.

## Usage

1. Open `http://localhost:3000`.
2. In **Settings**, add your provider API key (OpenAI, Anthropic, Gemini, Groq, xAI, or any OpenAI-compatible URL).
3. Go to **Anonymize** to paste text or upload a file and download the redacted copy.
4. Go to **Chat** to send messages. Sensitive spans are stripped before they reach your model. Turn on "Restore tokens in replies" to de-detect the model's answers locally.

## Tests

```bash
# Python engine
uv sync --dev
uv run pytest

# Web app
cd web
npm run typecheck && npm run lint && npm run build
```
