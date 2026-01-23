/// <reference lib="deno.ns" />
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-submission-viewer-secret",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });
}

function escapeHtml(v: unknown) {
  if (v == null) return "";
  return String(v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function isSensitiveKey(key: unknown) {
  if (typeof key !== "string") return false;
  return /token|authorization|password|secret/i.test(key);
}

function extractUrls(text: unknown) {
  if (typeof text !== "string") return [];
  const matches = text.match(/https?:\/\/[^\s<>"']+/g) || [];
  return matches
    .map((u) => u.replace(/[)\],.;]+$/g, "")) // tira pontuação no fim
    .filter(Boolean);
}

function displayUrlWithoutTokens(urlStr: unknown) {
  try {
    const u = new URL(String(urlStr));
    // não exibir query/hash (onde normalmente ficam tokens)
    return `${u.origin}${u.pathname}`;
  } catch {
    // fallback simples: corta tudo depois de ? ou #
    return String(urlStr).split("?")[0].split("#")[0];
  }
}

function flatten(obj: unknown, prefix = ""): Array<[string, unknown]> {
  const out: Array<[string, unknown]> = [];
  const isPlain = (x: unknown) => x && typeof x === "object" && !Array.isArray(x);
  if (!isPlain(obj)) return out;

  for (const k of Object.keys(obj as Record<string, unknown>)) {
    if (isSensitiveKey(k)) continue;
    const key = prefix ? `${prefix}.${k}` : k;
    const val = (obj as Record<string, unknown>)[k];

    if (isPlain(val)) {
      out.push(...flatten(val, key));
    } else if (Array.isArray(val)) {
      out.push([
        key,
        val
          .map((v) => (typeof v === "object" ? JSON.stringify(v) : String(v)))
          .join(", "),
      ]);
    } else {
      out.push([key, val]);
    }
  }
  return out;
}

function pickRecordsFromItems(items: unknown) {
  if (!Array.isArray(items) || items.length === 0) return [];
  const j0 = (items as Array<{ json?: unknown }>)[0]?.json;

  if (Array.isArray(j0)) return j0;
  if (j0 && typeof j0 === "object" && Array.isArray((j0 as Record<string, unknown>).data)) {
    return (j0 as Record<string, unknown>).data as unknown[];
  }

  if (j0 && typeof j0 === "object" && typeof (j0 as Record<string, unknown>).data === "string") {
    try {
      const parsed = JSON.parse((j0 as Record<string, unknown>).data as string);
      if (Array.isArray(parsed)) return parsed;
      if (parsed && typeof parsed === "object") return [parsed];
    } catch {
      // ignore
    }
  }

  if (items.length > 1) {
    const objs = (items as Array<{ json?: unknown }>)
      .map((i) => i?.json)
      .filter((v) => v && typeof v === "object");
    if (objs.length) return objs as unknown[];
  }

  if (j0 && typeof j0 === "object") return [j0];
  return [];
}

type EmbeddedImage = {
  mimeType: string;
  dataBase64: string;
  label?: string;
};

function getEmbeddedImagesForRecord(record: Record<string, unknown>) {
  const embedded: Array<{ src: string; label: string; isEmbedded: true }> = [];

  const candidates = [
    record.embedded_images,
    record.embeddedImages,
    record.images_embedded,
    record.imagesEmbedded,
  ];

  for (const c of candidates) {
    if (!Array.isArray(c)) continue;
    for (const img of c as EmbeddedImage[]) {
      if (!img || typeof img !== "object") continue;
      if (typeof img.mimeType !== "string") continue;
      if (!img.mimeType.startsWith("image/")) continue;
      if (typeof img.dataBase64 !== "string" || !img.dataBase64) continue;
      embedded.push({
        src: `data:${img.mimeType};base64,${img.dataBase64}`,
        label: typeof img.label === "string" && img.label ? img.label : "embedded",
        isEmbedded: true,
      });
    }
  }

  return embedded;
}

function buildImagesForRecord(record: Record<string, unknown>, opts: { stripUrlTokens: boolean }) {
  const embedded = getEmbeddedImagesForRecord(record);
  const rawField = record?.["Upload Image References"] ?? record?.upload_image_references;
  const urls = extractUrls(rawField);

  const fromUrls = urls.map((u, idx) => ({
    src: opts.stripUrlTokens ? displayUrlWithoutTokens(u) : u, // opcional: não manter query/hash no source
    display: displayUrlWithoutTokens(u), // sem token no view
    label: `URL ${idx + 1}`,
    isEmbedded: false as const,
  }));

  return { embedded, fromUrls };
}

function buildHtml(records: Array<Record<string, unknown>>, opts: { stripUrlTokens: boolean }) {
  const cardsHtml = records
    .map((rec, idx) => {
      const { embedded, fromUrls } = buildImagesForRecord(rec, opts);
      const pairs = flatten(rec).filter(([k]) => k !== "Upload Image References"); // evita mostrar URL crua no overview

      const tableRows = pairs
        .map(([k, v]) => `<tr><th>${escapeHtml(k)}</th><td>${escapeHtml(v)}</td></tr>`)
        .join("");

      const gallerySources = embedded.length ? embedded : fromUrls;

      const galleryHtml = gallerySources.length
        ? `<div class="gallery">
            ${gallerySources
              .map((img) => {
                const openHref = img.src; // pode conter token, mas não exibimos o token como texto
                const caption = img.isEmbedded
                  ? `Embedded (${escapeHtml(img.label)})`
                  : escapeHtml((img as unknown as { display?: string; label: string }).display || img.label);
                return `
                  <figure class="shot">
                    <a class="shotLink" href="${escapeHtml(openHref)}" target="_blank" rel="noopener noreferrer" title="Open image">
                      <img src="${escapeHtml(img.src)}" alt="Image reference" loading="lazy"/>
                    </a>
                    <figcaption class="cap">${caption}</figcaption>
                  </figure>
                `;
              })
              .join("")}
          </div>`
        : `<div class="empty">No image reference provided.</div>`;

      const refsHtml =
        fromUrls.length && embedded.length
          ? `<div class="refs">
              <div class="refsTitle">Online references (tokens hidden in view)</div>
              <ul>
                ${fromUrls
                  .map(
                    (u) =>
                      `<li><a href="${escapeHtml(u.src)}" target="_blank" rel="noopener noreferrer">${escapeHtml(
                        u.display,
                      )}</a></li>`,
                  )
                  .join("")}
              </ul>
            </div>`
          : "";

      return `
        <section class="card">
          <div class="cardHead">
            <div>
              <div class="title">Submission #${escapeHtml((rec as Record<string, unknown>).id_contato ?? idx + 1)}</div>
              <div class="sub">Name: <strong>${escapeHtml((rec as Record<string, unknown>).Name || "-")}</strong> • Country: ${escapeHtml(
                (rec as Record<string, unknown>).Country || "-",
              )} • Date: ${escapeHtml((rec as Record<string, unknown>)["Submission Date"] || "-")}</div>
            </div>
          </div>

          <div class="grid">
            <div class="panel">
              <div class="panelTitle">Overview</div>
              <table class="kv">${tableRows}</table>
            </div>

            <div class="panel">
              <div class="panelTitle">Reference Images</div>
              ${galleryHtml}
              ${refsHtml}
            </div>
          </div>
        </section>
      `;
    })
    .join("\n");

  const html = `<!doctype html>
<html lang="en-GB">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Submission Viewer</title>
  <style>
    :root{
      --bg:#0b0f14; --card:#121824; --muted:#93a4b8; --text:#e8eef6; --line:rgba(255,255,255,.08);
    }
    *{box-sizing:border-box}
    body{
      margin:0; padding:24px;
      font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
      background: radial-gradient(1200px 800px at 20% 0%, #0f1b2b 0%, var(--bg) 60%);
      color:var(--text);
      -webkit-font-smoothing: antialiased;
      text-rendering: geometricPrecision;
    }
    .wrap{max-width:1100px;margin:0 auto}
    header{
      display:flex;align-items:flex-end;justify-content:space-between;
      gap:16px;margin-bottom:18px;padding-bottom:14px;border-bottom:1px solid var(--line);
    }
    h1{margin:0;font-size:20px;font-weight:800;letter-spacing:.2px}
    .meta{color:var(--muted);font-size:13px}
    .card{
      border:1px solid var(--line);
      background:linear-gradient(180deg, rgba(255,255,255,.03), rgba(255,255,255,.01));
      border-radius:16px; padding:16px; margin:14px 0;
      box-shadow: 0 10px 30px rgba(0,0,0,.28);
    }
    .cardHead{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}
    .title{font-size:16px;font-weight:800}
    .sub{font-size:13px;color:var(--muted);margin-top:4px}
    .grid{display:grid;grid-template-columns: 1.2fr .8fr;gap:12px}
    @media (max-width: 900px){ .grid{grid-template-columns:1fr} }
    .panel{
      border:1px solid var(--line);
      background:rgba(10,16,24,.55);
      border-radius:14px;
      padding:12px;
      min-width: 0;
    }
    .panelTitle{
      font-size:12px;color:var(--muted);
      text-transform:uppercase;letter-spacing:.12em;margin-bottom:10px;
    }
    table.kv{width:100%;border-collapse:collapse;font-size:13px;table-layout:fixed}
    table.kv th{
      text-align:left;vertical-align:top;width:42%;
      padding:10px;border-top:1px solid var(--line);
      color:#bcd0e6;font-weight:700;
      word-break:break-word;
    }
    table.kv td{
      padding:10px;border-top:1px solid var(--line);
      color:var(--text);
      word-break:break-word;
      overflow-wrap:anywhere;
    }
    a{color:#8cc8ff}
    .empty{
      color:var(--muted);font-size:13px;padding:14px;
      border:1px dashed var(--line);border-radius:12px;text-align:center;
    }
    .gallery{
      display:grid;
      grid-template-columns: repeat(2, minmax(0,1fr));
      gap:10px;
    }
    @media (max-width: 900px){ .gallery{grid-template-columns:1fr} }
    .shot{
      margin:0;
      border:1px solid var(--line);
      border-radius:12px;
      overflow:hidden;
      background:#070b10;
    }
    .shotLink{display:block}
    .shot img{width:100%;height:auto;display:block}
    .cap{
      padding:8px 10px;
      font-size:12px;
      color:var(--muted);
      border-top:1px solid var(--line);
      word-break:break-word;
      overflow-wrap:anywhere;
    }
    .refs{
      margin-top:10px;
      border:1px solid var(--line);
      border-radius:12px;
      padding:10px;
      background:rgba(255,255,255,.03);
      font-size:12px;
      color:var(--muted);
    }
    .refsTitle{
      font-size:11px;
      text-transform:uppercase;
      letter-spacing:.12em;
      margin-bottom:6px;
      color:var(--muted);
    }
    .refs ul{margin:0;padding-left:18px}
    .refs li{margin:6px 0}
  </style>
</head>
<body>
  <div class="wrap">
    <header>
      <div>
        <h1>Submission Viewer</h1>
        <div class="meta">Generated on: ${escapeHtml(new Date().toISOString())}</div>
      </div>
      <div class="meta">Records: ${escapeHtml(records.length)}</div>
    </header>

    ${cardsHtml || `<div class="card"><div class="empty">No data received.</div></div>`}
  </div>
</body>
</html>`;

  return html;
}

function safeFileId(v: unknown) {
  const raw = v == null ? `${Date.now()}` : String(v);
  const safe = raw.replace(/[^a-zA-Z0-9_-]/g, "");
  return safe || `${Date.now()}`;
}

async function readJsonBody(req: Request): Promise<unknown> {
  try {
    const ct = req.headers.get("content-type") || "";
    if (!ct.includes("application/json")) return null;
    return await req.json();
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method === "GET") {
    return json({
      ok: true,
      message:
        "Use POST com JSON { records: [...] } (ou { items: [...] } no formato n8n). Opcional: { bucket, pathPrefix, fileName, upload, returnHtml }",
      now: new Date().toISOString(),
    });
  }

  if (req.method !== "POST") {
    return json({ ok: false, error: "Método não suportado" }, 405);
  }

  const bodyAny = await readJsonBody(req);
  if (!bodyAny) {
    return json({ ok: false, error: "Body JSON inválido (Content-Type application/json)" }, 400);
  }

  const sharedSecret = Deno.env.get("SUBMISSION_VIEWER_SECRET")?.trim() || "";
  if (sharedSecret) {
    const got = req.headers.get("x-submission-viewer-secret")?.trim() || "";
    if (got !== sharedSecret) {
      return json({ ok: false, error: "Unauthorized (missing/invalid x-submission-viewer-secret)" }, 401);
    }
  }

  const body = (Array.isArray(bodyAny) ? { records: bodyAny } : bodyAny) as Record<string, unknown>;
  if (!body) {
    return json({ ok: false, error: "Body JSON inválido" }, 400);
  }

  const bucket = (body.bucket as string | undefined) || Deno.env.get("SUBMISSION_VIEWER_BUCKET") || "submission-viewer";
  const pathPrefix = (body.pathPrefix as string | undefined) || "";
  const upload = body.upload === undefined ? true : Boolean(body.upload);
  const returnHtml = Boolean(body.returnHtml);
  const stripUrlTokens = Boolean(body.stripUrlTokens);
  const signedUrl = Boolean(body.signedUrl);
  const signedUrlExpiresIn = Number(body.signedUrlExpiresIn ?? 3600);

  // records podem vir direto ou via "items" (n8n)
  const direct = body.records ?? body.data;
  let records: Array<Record<string, unknown>> = [];

  if (Array.isArray(direct)) {
    records = direct.filter((r) => r && typeof r === "object") as Array<Record<string, unknown>>;
  } else if (direct && typeof direct === "object") {
    records = [direct as Record<string, unknown>];
  } else {
    const picked = pickRecordsFromItems(body.items);
    records = picked.filter((r) => r && typeof r === "object") as Array<Record<string, unknown>>;
  }

  const idContato = (records?.[0]?.id_contato as unknown) ?? body.id_contato ?? Date.now();
  const safeId = safeFileId(idContato);
  const fileName = (body.fileName as string | undefined) || `${safeId}.html`;
  const cleanPrefix = pathPrefix.replace(/^\/+/, "").replace(/\.\./g, "").trim();
  const cleanName = String(fileName).replace(/^\/+/, "").replace(/\.\./g, "").trim();
  const objectPath = cleanPrefix ? `${cleanPrefix.replace(/\/+$/g, "")}/${cleanName}` : cleanName;

  const html = buildHtml(records, { stripUrlTokens });

  if (!upload) {
    if (returnHtml) {
      return new Response(html, { status: 200, headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" } });
    }
    return json({ ok: true, uploaded: false, records: records.length, id_contato: idContato, fileName, path: objectPath });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !serviceKey) {
    return json(
      {
        ok: false,
        error: "Missing env vars: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY",
        hint: "Configure via supabase secrets set (cloud) ou supabase/.env (local).",
      },
      500,
    );
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceKey);
  const bytes = new TextEncoder().encode(html);

  const { error: uploadError } = await supabaseAdmin.storage.from(bucket).upload(objectPath, bytes, {
    contentType: "text/html; charset=utf-8",
    upsert: true,
  });

  if (uploadError) {
    return json({ ok: false, error: "Falha ao fazer upload no Storage", details: uploadError.message }, 500);
  }

  const { data: publicData } = supabaseAdmin.storage.from(bucket).getPublicUrl(objectPath);
  const signed =
    signedUrl
      ? await supabaseAdmin.storage.from(bucket).createSignedUrl(objectPath, Number.isFinite(signedUrlExpiresIn) ? signedUrlExpiresIn : 3600)
      : null;

  return json({
    ok: true,
    uploaded: true,
    records: records.length,
    id_contato: idContato,
    bucket,
    path: objectPath,
    fileName,
    publicUrl: publicData?.publicUrl ?? null,
    signedUrl: signed?.data?.signedUrl ?? null,
    html: returnHtml ? html : undefined,
  });
});

