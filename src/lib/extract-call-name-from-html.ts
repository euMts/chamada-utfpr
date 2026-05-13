const BODY_REGEX = /<body\b[^>]*>([\s\S]*?)<\/body>/i;
const TAG_REGEX = /<[^>]+>/g;
const FIRST_LABEL_REGEX = /<label\b[^>]*>([\s\S]*?)<\/label>/i;

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
  const match = body.match(FIRST_LABEL_REGEX);

  if (!match) {
    return { extractedText: null, matchedLabelHtml: null };
  }

  const innerHtml = match[1] ?? "";
  const text = decodeHtmlEntities(innerHtml.replace(TAG_REGEX, "").replace(/\s+/g, " ").trim());

  return {
    extractedText: text || null,
    matchedLabelHtml: match[0],
  };
}
