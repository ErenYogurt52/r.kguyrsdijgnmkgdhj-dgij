// Some job sites send descriptions as HTML ("<h2>Mô tả công việc</h2><p>- …</p><br>").
// htmlToText() turns that into plain text: block tags become line breaks, list items start
// with "- ", headings become lines starting with "## ", entities (&amp; &#39; …) are decoded.
// Plain text passes through unchanged. Used by the server (when a search runs) and by the
// browser (for results saved before this existed). The result is text, never HTML.

const ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', hellip: '…',
  lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”', bull: '•', middot: '·', copy: '©', reg: '®', trade: '™',
};
const decode = (s) => s.replace(/&(#x[0-9a-f]{1,6}|#\d{1,7}|[a-z]{2,8});/gi, (m, e) => {
  if (e[0] === '#') {
    const n = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
    return n > 0 && n < 0x110000 ? String.fromCodePoint(n) : m;
  }
  const v = ENTITIES[e.toLowerCase()];
  return v === undefined ? m : v;
});

// A tag needs a letter right after "<", so "<5 years" or "a < b" stay as they are.
const TAG = /<\/?[a-z][a-z0-9]*\b[^<>]*>/gi;
const HAS_TAG = /<\/?[a-z][a-z0-9]*\b[^<>]*>/i;
const BLOCK = /<\s*\/?\s*(p|div|ul|ol|tr|table|tbody|thead|section|article|header|footer|blockquote|dl|dt|dd)\b[^<>]*>/gi;

function strip(s) {
  return s
    .replace(/<(script|style)\b[\s\S]*?<\/\1\s*>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<\s*(h[1-6])\b[^<>]*>([\s\S]*?)<\s*\/\s*\1\s*>/gi, (m, tag, inner) => `\n## ${inner.replace(TAG, ' ')}\n`)
    .replace(/<\s*li\b[^<>]*>/gi, '\n- ')
    .replace(/<\s*br\s*\/?\s*>/gi, '\n')
    .replace(BLOCK, '\n')
    .replace(TAG, '');
}

export function htmlToText(input) {
  let s = String(input ?? '');
  if (!/[<&]/.test(s)) return s;
  s = decode(strip(s));
  if (HAS_TAG.test(s)) s = decode(strip(s)); // markup that was also HTML-escaped (&lt;p&gt;)
  return s
    .replace(/\r/g, '')
    .replace(/[ \t\f\v ]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/^- *\n/gm, '')        // empty list items
    .replace(/^## *\n/gm, '')       // empty headings
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
