import { NextRequest, NextResponse } from "next/server";

const FIRST_LABEL_REGEX = /<label\b[^>]*>([\s\S]*?)<\/label>/i;
const BODY_REGEX = /<body\b[^>]*>([\s\S]*?)<\/body>/i;
const TAG_REGEX = /<[^>]+>/g;

interface PortalResponse {
  portal?: {
    name?: unknown;
  };
}

function decodeHtmlEntities(value: string) {
  return value
    .replaceAll("&nbsp;", " ")
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

function getFirstLabel(html: string) {
  const body = html.match(BODY_REGEX)?.[1] ?? html;
  const label = body.match(FIRST_LABEL_REGEX)?.[1];

  if (!label) {
    return null;
  }

  return decodeHtmlEntities(label.replace(TAG_REGEX, "").replace(/\s+/g, " ").trim());
}

async function getLabelFromRegistrarUrl(url: URL) {
  const idChamada = url.searchParams.get("idChamada");

  if (!idChamada) {
    return null;
  }

  const portalUrl = new URL(`/api/portals/${encodeURIComponent(idChamada)}`, url.origin);
  const response = await fetch(portalUrl, { cache: "no-store" });

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as PortalResponse;
  const name = data.portal?.name;

  return typeof name === "string" && name.trim() ? name.trim() : null;
}

async function getLabelFromHtmlUrl(url: URL) {
  const response = await fetch(url, { cache: "no-store" });
  const html = await response.text();

  return getFirstLabel(html);
}

export async function GET(request: NextRequest) {
  const targetUrl = request.nextUrl.searchParams.get("url");

  if (!targetUrl) {
    return NextResponse.json({ error: "URL nao informada." }, { status: 400 });
  }

  let url: URL;

  try {
    url = new URL(targetUrl);
  } catch {
    return NextResponse.json({ error: "URL invalida." }, { status: 400 });
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    return NextResponse.json({ error: "Protocolo nao permitido." }, { status: 400 });
  }

  try {
    const label = url.pathname.endsWith("/registrar")
      ? await getLabelFromRegistrarUrl(url)
      : await getLabelFromHtmlUrl(url);

    return NextResponse.json({
      label: label ?? "Não encontrado",
    });
  } catch {
    return NextResponse.json({ label: "Não encontrado" });
  }
}
