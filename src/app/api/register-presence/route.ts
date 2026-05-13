import { createDecipheriv, createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getErrorMessage, logApiError } from "../_lib/error-utils";

const ALGORITHM = "aes-256-gcm";

interface Credentials {
  username: string;
  senha: string;
}

interface PresencePayload {
  username: string;
  senha: string;
  idChamada: string;
}

function getEncryptionKey() {
  const secret = process.env.LOCAL_STORAGE_ENCRYPTION_KEY;

  if (!secret) {
    throw new Error("LOCAL_STORAGE_ENCRYPTION_KEY nao configurada.");
  }

  return createHash("sha256").update(secret).digest();
}

function decryptCredentials(encryptedValue: string) {
  const payload = Buffer.from(encryptedValue, "base64");
  const iv = payload.subarray(0, 12);
  const authTag = payload.subarray(12, 28);
  const encrypted = payload.subarray(28);
  const decipher = createDecipheriv(ALGORITHM, getEncryptionKey(), iv);

  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]).toString("utf8");

  return JSON.parse(decrypted) as Credentials;
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

    url.search = "";
    url.hash = "";

    const credentials = decryptCredentials(encryptedCredentials);
    const payload: PresencePayload = {
      username: credentials.username,
      senha: credentials.senha,
      idChamada,
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const message = await response.text().catch(() => "");
      logApiError("register-presence:remote", message || `HTTP ${response.status}`, {
        targetUrl: url.toString(),
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
