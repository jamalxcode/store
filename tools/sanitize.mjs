// Tiny allow-list HTML cleaner for content imported from Shopify (no attributes except a few safe ones).
const TAGS = new Set(["p", "br", "strong", "b", "em", "i", "u", "ul", "ol", "li", "h2", "h3", "h4", "blockquote", "a", "img", "hr"]);
const ATTRS = { a: ["href"], img: ["src", "alt", "width", "height"] };

export function sanitize(html) {
  let s = String(html || "")
    .replace(/<(script|style|iframe|object|embed|svg)[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(\/?)([a-z0-9]+)([^>]*)>/gi, (m, close, tag, rest) => {
      tag = tag.toLowerCase();
      if (tag === "h1") tag = "h2";
      if (tag === "div" || tag === "section") return close ? "</p>" : "<p>";
      if (!TAGS.has(tag)) return "";
      if (close) return `</${tag}>`;
      const keep = [];
      for (const name of ATTRS[tag] || []) {
        const v = rest.match(new RegExp(`\\s${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, "i"));
        if (!v) continue;
        let val = v[2] ?? v[3];
        if ((name === "href" || name === "src") && !/^(https?:|\/|mailto:)/i.test(val.trim())) continue;
        keep.push(`${name}="${val.replace(/"/g, "&quot;")}"`);
      }
      if (tag === "a" && keep.some((k) => /href="https?:/i.test(k))) keep.push('rel="noopener"');
      return `<${tag}${keep.length ? " " + keep.join(" ") : ""}>`;
    })
    .replace(/<p>\s*(?:&nbsp;|\s)*<\/p>/g, "")
    .replace(/<p>\s*<p>/g, "<p>")
    .replace(/<\/p>\s*<\/p>/g, "</p>")
    .replace(/\n{2,}/g, "\n")
    .trim();
  return s;
}
