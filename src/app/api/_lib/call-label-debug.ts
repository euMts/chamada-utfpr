import { execFile } from "child_process";
import { promisify } from "util";
import { NextResponse } from "next/server";
import { extractCallNameFromRegistrarPageHtml } from "@/lib/extract-call-name-from-html";
import { UTFPR_CHAMADA_HOST } from "@/lib/chamada-url";
import { getErrorMessage, logApiError } from "./error-utils";

export interface LabelDebugInfo {
  source: "html-label" | "portal-api" | "error";
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

interface HtmlFetchResult {
  html: string;
  status: number;
  statusText: string;
  tlsVerificationRelaxed: boolean;
  finalUrl: string;
  errorMessage: string | null;
}

interface PortalApiFetchResult {
  label: string | null;
  url: string;
  status: number;
  statusText: string;
  responseText: string;
  errorMessage: string | null;
}

async function fetchHtmlFromChamada(url: URL): Promise<HtmlFetchResult> {
  const allowUtfprCertificate = url.hostname === UTFPR_CHAMADA_HOST && url.protocol === "https:";
  const tlsArgs = allowUtfprCertificate ? ["--insecure"] : [];
  const args = [
    "--silent",
    "--show-error",
    "--location",
    "--max-redirs",
    "8",
    ...tlsArgs,
    "--max-time",
    "8",
    "--user-agent",
    BROWSER_USER_AGENT,
    "--write-out",
    "\n%{http_code}\n%{url_effective}",
    url.toString(),
  ];

  try {
    const { stdout } = await execFileAsync("curl", args, {
      maxBuffer: 1024 * 1024 * 4,
    });

    return parseCurlOutput(stdout, allowUtfprCertificate, null);
  } catch (error) {
    const partialStdout = typeof (error as { stdout?: unknown }).stdout === "string"
      ? (error as { stdout: string }).stdout
      : "";

    if (partialStdout) {
      return parseCurlOutput(partialStdout, allowUtfprCertificate, getErrorMessage(error));
    }

    throw error;
  }
}

function parseCurlOutput(stdout: string, tlsVerificationRelaxed: boolean, errorMessage: string | null): HtmlFetchResult {
  const lines = stdout.split("\n");
  const finalUrl = lines.pop() ?? "";
  const status = Number(lines.pop() ?? 0);
  const html = lines.join("\n");

  return {
    html,
    status,
    statusText: status ? "OK" : "",
    tlsVerificationRelaxed,
    finalUrl,
    errorMessage,
  };
}

async function fetchPortalApiLabel(url: URL): Promise<PortalApiFetchResult | null> {
  const idChamada = url.searchParams.get("idChamada");

  if (!idChamada) {
    return null;
  }

  const portalApiUrl = new URL(`/api/portals/${encodeURIComponent(idChamada)}`, url.origin);
  const args = [
    "--silent",
    "--show-error",
    "--max-time",
    "8",
    "--user-agent",
    BROWSER_USER_AGENT,
    "--write-out",
    "\n%{http_code}",
    portalApiUrl.toString(),
  ];

  try {
    const { stdout } = await execFileAsync("curl", args, {
      maxBuffer: 1024 * 1024 * 2,
    });

    return parsePortalApiOutput(stdout, portalApiUrl.toString(), null);
  } catch (error) {
    const partialStdout = typeof (error as { stdout?: unknown }).stdout === "string"
      ? (error as { stdout: string }).stdout
      : "";

    if (partialStdout) {
      return parsePortalApiOutput(partialStdout, portalApiUrl.toString(), getErrorMessage(error));
    }

    return {
      label: null,
      url: portalApiUrl.toString(),
      status: 0,
      statusText: "",
      responseText: "",
      errorMessage: getErrorMessage(error),
    };
  }
}

function parsePortalApiOutput(stdout: string, url: string, errorMessage: string | null): PortalApiFetchResult {
  const separatorIndex = stdout.lastIndexOf("\n");
  const responseText = separatorIndex >= 0 ? stdout.slice(0, separatorIndex) : stdout;
  const status = separatorIndex >= 0 ? Number(stdout.slice(separatorIndex + 1)) : 0;
  let label: string | null = null;

  try {
    const data = JSON.parse(responseText) as { portal?: { name?: unknown } };
    const name = data.portal?.name;

    label = typeof name === "string" && name.trim() ? name.trim() : null;
  } catch {
    label = null;
  }

  return {
    label,
    url,
    status,
    statusText: status ? "OK" : "",
    responseText,
    errorMessage,
  };
}

async function getLabelFromHtmlUrl(url: URL): Promise<LabelLookupResult> {
  try {
    const response = await fetchHtmlFromChamada(url);
    const { matchedLabelHtml, extractedText } = extractCallNameFromRegistrarPageHtml(response.html);

    if (extractedText) {
      return {
        label: extractedText,
        debug: {
          source: "html-label",
          requestedUrl: url.toString(),
          idChamada: url.searchParams.get("idChamada"),
          searchedHtmlInfo: [
            "Foi feito um GET na URL completa da chamada usando curl.",
            "A URL da chamada foi usada exatamente como recebida, sem troca de host.",
            `URL final analisada: ${response.finalUrl}.`,
            "Foi lido o HTML retornado.",
            "Foi procurada a tag <label> com classe display-5 dentro do <body>; se ausente, foi usado o primeiro label que nao seja placeholder.",
            response.tlsVerificationRelaxed
              ? "A verificacao TLS do curl foi flexibilizada apenas para o dominio lds.td.utfpr.edu.br."
              : "A verificacao TLS padrao do curl foi mantida.",
          ],
          matchedLabelHtml,
          extractedText,
          fetchedHtml: response.html,
          fetchStatus: response.status,
          fetchStatusText: response.statusText,
          errorMessage: response.errorMessage ?? (response.status >= 200 && response.status < 300
            ? null
            : `Resposta HTTP nao OK: ${response.status}`),
        },
      };
    }

    const portalApiResult = await fetchPortalApiLabel(url);

    if (portalApiResult?.label) {
      return {
        label: portalApiResult.label,
        debug: {
          source: "portal-api",
          requestedUrl: url.toString(),
          idChamada: url.searchParams.get("idChamada"),
          searchedHtmlInfo: [
            "Foi feito um GET na URL completa da chamada usando curl.",
            "A URL da chamada foi usada exatamente como recebida, sem troca de host.",
            `URL final analisada: ${response.finalUrl}.`,
            "O HTML inicial nao continha um label de chamada valido.",
            `Foi consultada a API do mesmo host recebido: ${portalApiResult.url}.`,
            "Foi usado o campo portal.name retornado pela API.",
          ],
          matchedLabelHtml,
          extractedText: portalApiResult.label,
          fetchedHtml: response.html,
          fetchStatus: portalApiResult.status,
          fetchStatusText: portalApiResult.statusText,
          errorMessage: portalApiResult.errorMessage,
        },
      };
    }

    return {
      label: null,
      debug: {
        source: "html-label",
        requestedUrl: url.toString(),
        idChamada: url.searchParams.get("idChamada"),
        searchedHtmlInfo: [
          "Foi feito um GET na URL completa da chamada usando curl.",
          "A URL da chamada foi usada exatamente como recebida, sem troca de host.",
          `URL final analisada: ${response.finalUrl}.`,
          "Foi lido o HTML retornado.",
          "Foi procurada a tag <label> com classe display-5 dentro do <body>; se ausente, foi usado o primeiro label que nao seja placeholder.",
          portalApiResult
            ? `Como o HTML nao tinha label valido, foi consultada a API do mesmo host recebido: ${portalApiResult.url}.`
            : "Como o HTML nao tinha label valido, nao havia idChamada para consultar a API de portal.",
          response.tlsVerificationRelaxed
            ? "A verificacao TLS do curl foi flexibilizada apenas para o dominio lds.td.utfpr.edu.br."
            : "A verificacao TLS padrao do curl foi mantida.",
        ],
        matchedLabelHtml,
        extractedText,
        fetchedHtml: response.html,
        fetchStatus: portalApiResult?.status ?? response.status,
        fetchStatusText: portalApiResult?.statusText ?? response.statusText,
        errorMessage: portalApiResult?.errorMessage ?? response.errorMessage ?? (response.status >= 200 && response.status < 300
          ? null
          : `Resposta HTTP nao OK: ${response.status}`),
      },
    };
  } catch (error) {
    logApiError("chamada-label:curl", error, {
      url: url.toString(),
      idChamada: url.searchParams.get("idChamada"),
    });

    return {
      label: null,
      debug: {
        source: "error",
        requestedUrl: url.toString(),
        idChamada: url.searchParams.get("idChamada"),
        searchedHtmlInfo: [
          "Foi tentado fazer GET na propria URL da chamada usando curl.",
          "A URL da chamada foi usada exatamente como recebida, sem troca de host.",
          "A requisicao falhou antes que o HTML pudesse ser analisado.",
        ],
        fetchedHtml: null,
        fetchStatus: null,
        fetchStatusText: null,
        errorMessage: getErrorMessage(error),
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
    error: "Não foi possível buscar o nome da chamada.",
  });
}
