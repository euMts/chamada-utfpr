import { NextResponse } from "next/server";
import { extractCallNameFromRegistrarPageHtml } from "@/lib/extract-call-name-from-html";

interface PortalResponse {
  portal?: {
    name?: unknown;
  };
}

export interface LabelDebugInfo {
  source: "registrar-api" | "html-label" | "error";
  requestedUrl: string;
  idChamada: string | null;
  searchedHtmlInfo: string[];
  portalLookupUrl?: string;
  matchedLabelHtml?: string | null;
  extractedText?: string | null;
  fetchedHtml?: string | null;
  fetchStatus?: number | null;
  fetchStatusText?: string | null;
  errorMessage?: string | null;
}

export interface LabelLookupResult {
  label: string | null;
  debug: LabelDebugInfo;
}

const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

async function getLabelFromRegistrarUrl(url: URL): Promise<LabelLookupResult> {
  const idChamada = url.searchParams.get("idChamada");
  const portalUrl = idChamada
    ? new URL(`/api/portals/${encodeURIComponent(idChamada)}`, url.origin)
    : null;

  const debug: LabelDebugInfo = {
    source: "registrar-api",
    requestedUrl: url.toString(),
    idChamada,
    searchedHtmlInfo: [
      "Nenhum campo do HTML foi buscado para esta URL.",
      "Quando o caminho termina com /registrar, o nome vem do endpoint /api/portals/:idChamada no mesmo host.",
    ],
    portalLookupUrl: portalUrl?.toString(),
  };

  if (!idChamada || !portalUrl) {
    return { label: null, debug };
  }

  const response = await fetch(portalUrl, { cache: "no-store" });

  if (!response.ok) {
    return { label: null, debug };
  }

  const data = (await response.json()) as PortalResponse;
  const name = data.portal?.name;

  return {
    label: typeof name === "string" && name.trim() ? name.trim() : null,
    debug,
  };
}

async function getLabelFromHtmlUrl(url: URL): Promise<LabelLookupResult> {
  try {
    const response = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(30000),
      headers: {
        Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
        "User-Agent": BROWSER_USER_AGENT,
      },
    });
    const html = await response.text();
    const { matchedLabelHtml, extractedText } = extractCallNameFromRegistrarPageHtml(html);

    return {
      label: extractedText,
      debug: {
        source: "html-label",
        requestedUrl: url.toString(),
        idChamada: url.searchParams.get("idChamada"),
        searchedHtmlInfo: [
          "Foi feito um GET na propria URL da chamada para inspecionar o HTML retornado.",
          "Foi buscado o conteúdo dentro da tag <body> da página.",
          "Foram listados todos os <label>; ignoram-se sr-only e textos curtos tipo Usuário/Senha.",
          "Prioriza-se <label class=\"display-5\"> (nome da disciplina) e equivalentes.",
        ],
        matchedLabelHtml,
        extractedText,
        fetchedHtml: html,
        fetchStatus: response.status,
        fetchStatusText: response.statusText,
        errorMessage: response.ok ? null : `Resposta HTTP nao OK: ${response.status} ${response.statusText}`,
      },
    };
  } catch (error) {
    return {
      label: null,
      debug: {
        source: "error",
        requestedUrl: url.toString(),
        idChamada: url.searchParams.get("idChamada"),
        searchedHtmlInfo: [
          "Foi tentado fazer GET na propria URL da chamada para buscar o nome no HTML.",
          "A requisicao falhou antes que o HTML pudesse ser analisado.",
        ],
        fetchedHtml: null,
        fetchStatus: null,
        fetchStatusText: null,
        errorMessage: error instanceof Error ? `${error.name}: ${error.message}` : "Erro desconhecido ao buscar HTML.",
      },
    };
  }
}

export async function resolveCallLabel(targetUrl: string): Promise<LabelLookupResult> {
  const url = new URL(targetUrl);

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Protocolo nao permitido.");
  }

  return url.pathname.endsWith("/registrar")
    ? getLabelFromRegistrarUrl(url)
    : getLabelFromHtmlUrl(url);
}

export function buildCallLabelErrorResponse(targetUrl: string) {
  const url = new URL(targetUrl);

  return NextResponse.json({
    label: "Não encontrado",
    debug: {
      source: "error",
      requestedUrl: url.toString(),
      idChamada: url.searchParams.get("idChamada"),
      searchedHtmlInfo: ["Nao foi possivel concluir a busca do nome da chamada."],
      errorMessage: "Falha inesperada ao montar a resposta de debug.",
    } satisfies LabelDebugInfo,
  });
}
