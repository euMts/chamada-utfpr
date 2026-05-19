import { NextRequest, NextResponse } from "next/server";
import { decryptCredentials } from "../_lib/credentials";
import { getErrorMessage, logApiError } from "../_lib/error-utils";

interface PresencePayload {
  username: string;
  senha: string;
  idChamada: string;
}

export async function POST(request: NextRequest) {
  let phase = "parse-request-body";
  let originalUrl = "";
  let idChamada: string | null = null;
  let targetUrl: URL | null = null;

  try {
    const body = await request.json();
    const encryptedCredentials = String(body.encryptedCredentials ?? "");
    originalUrl = String(body.originalUrl ?? "");

    if (!encryptedCredentials || !originalUrl) {
      return NextResponse.json({ error: "Dados incompletos." }, { status: 400 });
    }

    phase = "parse-original-url";
    const url = new URL(originalUrl);
    idChamada = url.searchParams.get("idChamada");

    if (!idChamada) {
      return NextResponse.json({ error: "URL sem idChamada." }, { status: 400 });
    }

    if (!["http:", "https:"].includes(url.protocol)) {
      return NextResponse.json({ error: "Protocolo nao permitido." }, { status: 400 });
    }

    phase = "build-target-url";
    targetUrl = new URL(url.toString());

    targetUrl.search = "";
    targetUrl.hash = "";

    phase = "decrypt-credentials";
    const credentials = decryptCredentials(encryptedCredentials);
    const payload: PresencePayload = {
      username: credentials.username,
      senha: credentials.senha,
      idChamada,
    };

    phase = "post-remote-presence";
    const response = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const message = await response.text().catch(() => "");
      logApiError("register-presence:remote", message || `HTTP ${response.status}`, {
        phase,
        originalUrl,
        targetUrl: targetUrl.toString(),
        targetOrigin: targetUrl.origin,
        targetProtocol: targetUrl.protocol,
        targetHostname: targetUrl.hostname,
        targetPort: targetUrl.port || null,
        targetPathname: targetUrl.pathname,
        status: response.status,
        statusText: response.statusText,
        idChamada,
        responseBody: message || null,
      });

      return NextResponse.json(
        { error: message || "Não foi possível registrar presença." },
        { status: response.status },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    logApiError("register-presence:route", error, {
      phase,
      originalUrl: originalUrl || null,
      idChamada,
      targetUrl: targetUrl?.toString() ?? null,
      targetOrigin: targetUrl?.origin ?? null,
      targetProtocol: targetUrl?.protocol ?? null,
      targetHostname: targetUrl?.hostname ?? null,
      targetPort: targetUrl?.port || null,
      targetPathname: targetUrl?.pathname ?? null,
    });

    return NextResponse.json(
      { error: "Não foi possível registrar presença.", cause: getErrorMessage(error) },
      { status: 500 },
    );
  }
}
