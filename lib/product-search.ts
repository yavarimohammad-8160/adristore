/** Normalize Persian/Arabic text for fuzzy comparison. */
export function normalizeSearchText(text: string): string {
  return text
    .normalize("NFKC")
    .replace(/[\u200c\u200f\u202a-\u202e]/g, "")
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/ة/g, "ه")
    .replace(/أ|إ|آ/g, "ا")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ی")
    .replace(/[\u064b-\u065f]/g, "")
    .replace(/[\s\-_/.,]+/g, " ")
    .trim()
    .toLowerCase();
}

/** Common Latin transliterations for Persian player names. */
const PLAYER_LATIN_ALIASES: Record<string, string[]> = {
  بیلینگهام: ["bellingham", "jude bellingham", "jude"],
  مسی: ["messi", "lionel messi", "lionel"],
  رونالدو: ["ronaldo", "cristiano ronaldo", "cristiano"],
  هالند: ["haaland", "erling haaland", "erling"],
  امباپه: ["mbappe", "kylian mbappe", "kylian"],
  بنزما: ["benzema", "karim benzema"],
  صلاح: ["salah", "mohamed salah", "mo salah"],
  مودریچ: ["modric", "luka modric"],
  وینیسیوس: ["vinicius", "vini jr", "vinícius"],
  یامال: ["yamal", "lamine yamal", "lamine"],
  پله: ["pele"],
  مارادونا: ["maradona", "diego maradona"],
  زیدان: ["zidane", "zinedine zidane"],
  رونالدینیو: ["ronaldinho"],
  کریستیانو: ["cristiano"],
  لیونل: ["lionel"],
};

function addPersianSpellingVariants(base: string, out: Set<string>) {
  const add = (value: string) => {
    const normalized = normalizeSearchText(value);
    if (normalized.length >= 2) out.add(normalized);
    const compact = normalized.replace(/\s+/g, "");
    if (compact.length >= 2) out.add(compact);
  };

  add(base);
  add(base.replace(/گه/g, "گ"));
  add(base.replace(/گ(?=[اآ])/g, "گه"));
  add(base.replace(/ه(?=[اآ])/g, ""));
  add(base.replace(/^بیل/, "بل"));
  add(base.replace(/^بل(?=ی)/, "بیل"));

  for (const variant of [...out]) {
    add(variant.replace(/گه/g, "گ"));
    add(variant.replace(/^بیل/, "بل"));
    add(variant.replace(/ه(?=[اآ])/g, ""));
  }
}

/** Expand a query into normalized spelling variants and known aliases. */
export function searchTextVariants(query: string): string[] {
  const base = normalizeSearchText(query);
  if (!base) return [];

  const variants = new Set<string>();
  addPersianSpellingVariants(base, variants);

  for (const [persian, latin] of Object.entries(PLAYER_LATIN_ALIASES)) {
    const persianNorm = normalizeSearchText(persian);
    const persianVariants = new Set<string>();
    addPersianSpellingVariants(persianNorm, persianVariants);

    const matches = [...variants, base].some(
      (v) =>
        v === persianNorm ||
        [...persianVariants].some((pv) => v === pv || v.includes(pv) || pv.includes(v))
    );

    if (matches) {
      persianVariants.forEach((v) => variants.add(v));
      latin.forEach((alias) => variants.add(normalizeSearchText(alias)));
    }
  }

  return [...variants];
}

function isFuzzySubsequence(haystack: string, needle: string): boolean {
  if (needle.length < 4) return false;

  const maxSkips = needle.length >= 7 ? 2 : 1;
  let hi = 0;
  let skips = 0;

  for (let ni = 0; ni < needle.length; ni++) {
    const ch = needle[ni];
    let found = false;

    while (hi < haystack.length) {
      if (haystack[hi] === ch) {
        found = true;
        hi++;
        break;
      }
      hi++;
      skips++;
      if (skips > maxSkips) return false;
    }

    if (!found) return false;
  }

  return true;
}

/** True when normalized text matches the query (partial, variant, or fuzzy). */
export function textMatchesQuery(text: string, query: string): boolean {
  const haystack = normalizeSearchText(text);
  const q = query.trim();
  if (!q) return true;
  if (!haystack) return false;

  const variants = searchTextVariants(q);

  for (const needle of variants) {
    if (needle.length >= 2 && haystack.includes(needle)) return true;
    if (needle.length >= 4 && isFuzzySubsequence(haystack, needle)) return true;
  }

  const tokens = normalizeSearchText(q).split(" ").filter((t) => t.length >= 2);
  if (tokens.length > 1) {
    return tokens.every((token) => textMatchesQuery(text, token));
  }

  return false;
}

export function productMatchesSearch(
  product: { title: string; description?: string; brief?: string; tags?: string[] },
  query: string
): boolean {
  const q = query.trim();
  if (!q) return true;

  const fields = [
    product.title,
    product.description || "",
    product.brief || "",
    ...(product.tags || []),
  ];

  return fields.some((field) => textMatchesQuery(field, q));
}