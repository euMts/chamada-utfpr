import { NextRequest, NextResponse } from "next/server";
import { buildCallLabelErrorResponse, resolveCallLabel } from "../_lib/call-label-debug";

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
    const result = await resolveCallLabel(url.toString());

    return NextResponse.json({
      label: result.label ?? "Não encontrado",
      debug: result.debug,
    });
  } catch {
    return buildCallLabelErrorResponse(url.toString());
  }
}
