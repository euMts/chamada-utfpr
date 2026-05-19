import { NextRequest, NextResponse } from "next/server";
import { decryptCredentials } from "../_lib/credentials";
import { getErrorMessage, logApiError } from "../_lib/error-utils";

interface PresencePayload {
  username: string;
  senha: string;
  idChamada: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const encryptedCredentials = String(body.encryptedCredentials ?? "");
    const originalUrl = String(body.originalUrl ?? "");

    if (!encryptedCredentials || !originalUrl) {
      return NextResponse.json({ error: "Dados incompletos." }, { status: 400 });
    }

    const url = new URL(originalUrl);
    const idChamada = url.searchParams.get("idChamada");

    if (!idChamada) {
      return NextResponse.json({ error: "URL sem idChamada." }, { status: 400 });
    }

    if (!["http:", "https:"].includes(url.protocol)) {
      return NextResponse.json({ error: "Protocolo nao permitido." }, { status: 400 });
    }

    const targetUrl = new URL(url.toString());

    targetUrl.search = "";
    targetUrl.hash = "";

    const credentials = decryptCredentials(encryptedCredentials);
    const payload: PresencePayload = {
      username: credentials.username,
      senha: credentials.senha,
      idChamada,
    };

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
        targetUrl: targetUrl.toString(),
        status: response.status,
        idChamada,
      });

      return NextResponse.json(
        { error: message || "Não foi possível registrar presença." },
        { status: response.status },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    logApiError("register-presence:route", error);

    return NextResponse.json(
      { error: "Não foi possível registrar presença.", cause: getErrorMessage(error) },
      { status: 500 },
    );
  }
}
