const BODY_REGEX = /<body\b[^>]*>([\s\S]*?)<\/body>/i;
const TAG_REGEX = /<[^>]+>/g;
const LABEL_BLOCK_REGEX = /<label\b([^>]*)>([\s\S]*?)<\/label>/gi;

function decodeHtmlEntities(value: string) {
  return value
    .replaceAll("&nbsp;", " ")
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

/**
 * Extrai o nome da disciplina/chamada do HTML da página registrarPresenca.
 * Ignora labels sr-only e rótulos de formulário (Usuário/Senha); prioriza display-5.
 */
export function extractCallNameFromRegistrarPageHtml(html: string): {
  extractedText: string | null;
  matchedLabelHtml: string | null;
} {
  const body = html.match(BODY_REGEX)?.[1] ?? html;

  let best: { text: string; innerHtml: string; score: number } | null = null;

  LABEL_BLOCK_REGEX.lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = LABEL_BLOCK_REGEX.exec(body)) !== null) {
    const attrs = match[1] ?? "";
    const inner = match[2] ?? "";
    const text = decodeHtmlEntities(inner.replace(TAG_REGEX, "").replace(/\s+/g, " ").trim());

    if (text.length < 3) {
      continue;
    }

    if (/\bsr-only\b/i.test(attrs)) {
      continue;
    }

    if (/^(usuário|usuario|senha)$/i.test(text)) {
      continue;
    }

    let score = Math.min(text.length, 200);

    if (/\bdisplay-5\b/i.test(attrs)) {
      score += 120;
    }

    if (/\bdisplay-[46]\b/i.test(attrs)) {
      score += 60;
    }

    if (/\bh2\b/i.test(attrs)) {
      score += 20;
    }

    if (!best || score > best.score) {
      best = { text, innerHtml: inner, score };
    }
  }

  if (!best) {
    return { extractedText: null, matchedLabelHtml: null };
  }

  return {
    extractedText: best.text,
    matchedLabelHtml: best.innerHtml.trim() || null,
  };
}
