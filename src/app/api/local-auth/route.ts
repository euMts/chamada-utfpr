import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";

const ALGORITHM = "aes-256-gcm";

interface Credentials {
  username: string;
  senha: string;
}

function getEncryptionKey() {
  const secret = process.env.LOCAL_STORAGE_ENCRYPTION_KEY;

  if (!secret) {
    throw new Error("LOCAL_STORAGE_ENCRYPTION_KEY nao configurada.");
  }

  return createHash("sha256").update(secret).digest();
}

function encryptCredentials(credentials: Credentials) {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, getEncryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(credentials), "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return Buffer.concat([iv, authTag, encrypted]).toString("base64");
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

    if (body.action === "encrypt") {
      const username = String(body.username ?? "").trim();
      const senha = String(body.senha ?? "");

      if (!username || !senha) {
        return NextResponse.json({ error: "Credenciais incompletas." }, { status: 400 });
      }

      return NextResponse.json({
        encrypted: encryptCredentials({ username, senha }),
        username,
      });
    }

    if (body.action === "decrypt") {
      const encrypted = String(body.encrypted ?? "");

      if (!encrypted) {
        return NextResponse.json({ error: "Credenciais nao informadas." }, { status: 400 });
      }

      const credentials = decryptCredentials(encrypted);

      return NextResponse.json({
        username: credentials.username,
      });
    }

    return NextResponse.json({ error: "Acao invalida." }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Nao foi possivel processar a autenticacao." }, { status: 500 });
  }
}
