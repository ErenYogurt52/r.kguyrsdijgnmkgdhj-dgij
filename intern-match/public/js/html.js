// Tiny tagged-template helper: values are escaped unless wrapped with raw() or h``.
class Safe { constructor(s) { this.s = s; } toString() { return this.s; } }
export const esc = (v) => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const render = (v) => (v instanceof Safe ? v.s : Array.isArray(v) ? v.map(render).join('') : v == null || v === false ? '' : esc(v));
export const h = (str, ...vals) => new Safe(str.reduce((o, s, i) => o + s + (i < vals.length ? render(vals[i]) : ''), ''));
export const raw = (s) => new Safe(String(s));
export const toHtml = (v) => render(v);
