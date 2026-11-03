import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const ENGINE = (process.env.ANONYMIZER_URL ?? "http://localhost:8000").replace(/\/$/, "");

export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Expected a multipart upload." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "A file is required." }, { status: 400 });
  }

  const output = String(form.get("output") ?? "text");
  const outbound = new FormData();
  outbound.append("file", file, file.name);
  outbound.append("strategy", String(form.get("strategy") ?? "placeholder"));
  outbound.append("ner", String(form.get("ner") ?? "false"));
  outbound.append("output", output);

  let response: Response;
  try {
    response = await fetch(`${ENGINE}/anonymize-file`, { method: "POST", body: outbound });
  } catch {
    return NextResponse.json(
      {
        error: `Cannot reach the anonymizer engine at ${ENGINE}. Start it with "python -m uvicorn anonymizer.api:app --reload --port 8000".`,
      },
      { status: 502 },
    );
  }

  if (!response.ok) {
    let detail = "";
    try {
      const body = (await response.json()) as { detail?: unknown };
      detail = typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail ?? "");
    } catch {
      detail = (await response.text().catch(() => "")).slice(0, 300);
    }
    return NextResponse.json(
      { error: detail || `Engine error ${response.status}` },
      { status: response.status === 413 ? 413 : 502 },
    );
  }

  if (output === "pdf") {
    const buffer = await response.arrayBuffer();
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "X-Redacted-Entities": response.headers.get("X-Redacted-Entities") ?? "",
        "X-Missed-Entities": response.headers.get("X-Missed-Entities") ?? "",
      },
    });
  }

  const data = await response.json();
  return NextResponse.json(data);
}
