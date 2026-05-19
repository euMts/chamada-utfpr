import { NextRequest, NextResponse } from "next/server";
import { decryptCredentials, encryptCredentials } from "../_lib/credentials";

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
