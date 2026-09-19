/**
 * Serialises structured data for an inline `<script type="application/ld+json">`.
 *
 * `JSON.stringify` alone is not enough: it leaves `<` and `>` intact, so a value
 * containing `</script>` would close the tag early and let the rest of the string be
 * parsed as HTML. Escaping them - plus U+2028/U+2029, which are legal inside JSON but
 * are line terminators to a JS parser - keeps admin-authored text inert whatever it
 * contains. All of these escapes are transparent to a JSON-LD consumer.
 */

const LS = String.fromCharCode(0x2028);
const PS = String.fromCharCode(0x2029);
// Built from char codes so this file never holds a raw separator itself.
const SEPARATORS = new RegExp(`[${LS}${PS}]`, "g");

export function jsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(SEPARATORS, (char) => (char === LS ? "\\u2028" : "\\u2029"));
}
