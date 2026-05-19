const BODY_REGEX = /<body\b[^>]*>([\s\S]*?)<\/body>/i;
const TAG_REGEX = /<[^>]+>/g;
const LABEL_REGEX = /<label\b[^>]*>([\s\S]*?)<\/label>/gi;
const CALL_NAME_LABEL_REGEX = /<label\b(?=[^>]*\bclass=["'][^"']*\bdisplay-5\b)[^>]*>([\s\S]*?)<\/label>/i;
const IGNORED_LABEL_TEXTS = new Set([
  "Portal não encontrado",
  "Portal nao encontrado",
  "Usuário",
  "Usuario",
  "Senha",
  "msg",
]);

function decodeHtmlEntities(value: string) {
  return value
    .replaceAll("&nbsp;", " ")
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

export function extractCallNameFromRegistrarPageHtml(html: string): {
  extractedText: string | null;
  matchedLabelHtml: string | null;
} {
  const body = html.match(BODY_REGEX)?.[1] ?? html;
  const preferredMatch = body.match(CALL_NAME_LABEL_REGEX);
  const match = preferredMatch ?? Array.from(body.matchAll(LABEL_REGEX)).find((labelMatch) => {
    const text = getLabelText(labelMatch[1] ?? "");

    return text && !IGNORED_LABEL_TEXTS.has(text);
  });

  if (!match) {
    return { extractedText: null, matchedLabelHtml: null };
  }

  const text = getLabelText(match[1] ?? "");

  return {
    extractedText: text || null,
    matchedLabelHtml: match[0],
  };
}

function getLabelText(innerHtml: string) {
  return decodeHtmlEntities(innerHtml.replace(TAG_REGEX, "").replace(/\s+/g, " ").trim());
}
