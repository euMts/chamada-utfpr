import { execFile } from "child_process";
import { promisify } from "util";
import { NextResponse } from "next/server";
import { extractCallNameFromRegistrarPageHtml } from "@/lib/extract-call-name-from-html";

export interface LabelDebugInfo {
  source: "html-label" | "error";
  requestedUrl: string;
  idChamada: string | null;
  searchedHtmlInfo: string[];
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
const execFileAsync = promisify(execFile);

async function fetchHtmlWithCurl(url: URL) {
  const { stdout } = await execFileAsync(
    "curl",
    [
      "--silent",
      "--show-error",
      "--location",
      "--max-time",
      "8",
      "--user-agent",
      BROWSER_USER_AGENT,
      "--write-out",
      "\n%{http_code}",
      url.toString(),
    ],
    {
      maxBuffer: 1024 * 1024 * 4,
    },
  );

  const separatorIndex = stdout.lastIndexOf("\n");
  const html = separatorIndex >= 0 ? stdout.slice(0, separatorIndex) : stdout;
  const status = separatorIndex >= 0 ? Number(stdout.slice(separatorIndex + 1)) : 0;

  return {
    html,
    status,
    statusText: status ? "OK" : "",
  };
}

async function getLabelFromHtmlUrl(url: URL): Promise<LabelLookupResult> {
  try {
    const response = await fetchHtmlWithCurl(url);
    const { matchedLabelHtml, extractedText } = extractCallNameFromRegistrarPageHtml(response.html);

    return {
      label: extractedText,
      debug: {
        source: "html-label",
        requestedUrl: url.toString(),
        idChamada: url.searchParams.get("idChamada"),
        searchedHtmlInfo: [
          "Foi feito um GET na URL completa da chamada usando curl.",
          "Foi lido o HTML retornado.",
          "Foi extraido o conteudo da primeira tag <label> dentro do <body>.",
        ],
        matchedLabelHtml,
        extractedText,
        fetchedHtml: response.html,
        fetchStatus: response.status,
        fetchStatusText: response.statusText,
        errorMessage: response.status >= 200 && response.status < 300
          ? null
          : `Resposta HTTP nao OK: ${response.status}`,
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
          "Foi tentado fazer GET na propria URL da chamada usando curl.",
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

  return getLabelFromHtmlUrl(url);
}

export function buildCallLabelErrorResponse(targetUrl: string) {
  const url = new URL(targetUrl);

  return NextResponse.json({
    label: null,
    debug: {
      source: "error",
      requestedUrl: url.toString(),
      idChamada: url.searchParams.get("idChamada"),
      searchedHtmlInfo: ["Nao foi possivel concluir a busca do nome da chamada."],
      errorMessage: "Falha inesperada ao montar a resposta de debug.",
    } satisfies LabelDebugInfo,
  });
}
