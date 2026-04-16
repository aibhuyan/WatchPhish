const HOMOGLYPH_MAP: Record<string, string[]> = {
  'a': ['а', 'ą', 'ä', 'à', 'á', 'â', 'ã', 'å', '@'],
  'b': ['ь', 'Ь', 'ḃ'],
  'c': ['с', 'ç', 'ć', 'ĉ'],
  'd': ['ԁ', 'ḋ', 'ď'],
  'e': ['е', 'ё', 'ę', 'ė', 'è', 'é', 'ê', 'ë'],
  'g': ['ɡ', 'ğ'],
  'h': ['һ', 'ḥ'],
  'i': ['і', 'í', 'ì', 'î', 'ï', 'ı', '1', 'l', '!'],
  'j': ['ј'],
  'k': ['к', 'ḱ'],
  'l': ['ӏ', 'ḷ', '1', 'i', '|'],
  'm': ['м', 'ṁ', 'rn'],
  'n': ['п', 'ñ', 'ń'],
  'o': ['о', 'ö', 'ò', 'ó', 'ô', 'õ', '0', 'ø'],
  'p': ['р', 'ṗ'],
  'q': ['ԛ'],
  'r': ['г', 'ŕ'],
  's': ['ѕ', 'ś', 'š', '$', '5'],
  't': ['т', 'ṫ', 'ť'],
  'u': ['υ', 'ü', 'ù', 'ú', 'û'],
  'v': ['ν', 'ṿ'],
  'w': ['ω', 'ẁ', 'ẃ', 'ẅ', 'vv'],
  'x': ['х', 'ẋ'],
  'y': ['у', 'ý', 'ÿ', 'ŷ'],
  'z': ['ẑ', 'ż', 'ž'],
};

const REVERSE_HOMOGLYPH: Map<string, string> = new Map();
for (const [latin, homoglyphs] of Object.entries(HOMOGLYPH_MAP)) {
  for (const h of homoglyphs) {
    if (h.length === 1) {
      REVERSE_HOMOGLYPH.set(h, latin);
    }
  }
}

function normalizeHomoglyphs(input: string): string {
  let result = '';
  for (const char of input) {
    result += REVERSE_HOMOGLYPH.get(char) ?? char;
  }
  return result;
}

function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost,
      );
    }
  }
  return dp[m][n];
}

function extractDomainParts(domain: string): { base: string; tld: string; sld: string } {
  const parts = domain.toLowerCase().replace(/^www\./, '').split('.');
  if (parts.length >= 2) {
    return { base: parts.slice(0, -1).join('.'), tld: parts[parts.length - 1], sld: parts[0] };
  }
  return { base: parts[0], tld: '', sld: parts[0] };
}

export interface MatchResult {
  matched: boolean;
  brand: string;
  matchType: 'typosquat' | 'homoglyph' | 'keyword';
  score: number;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function checkLabelAgainstBrand(label: string, brandLower: string): MatchResult | null {
  if (label === brandLower) return null;

  const normalizedLabel = normalizeHomoglyphs(label);
  if (normalizedLabel !== label && normalizedLabel === brandLower) {
    return { matched: true, brand: brandLower, matchType: 'homoglyph', score: 0.95 };
  }
  if (normalizedLabel !== label && levenshteinDistance(normalizedLabel, brandLower) <= 1) {
    return { matched: true, brand: brandLower, matchType: 'homoglyph', score: 0.9 };
  }

  const distance = levenshteinDistance(label, brandLower);
  if (brandLower.length >= 4 && distance === 1) {
    return { matched: true, brand: brandLower, matchType: 'typosquat', score: 0.85 };
  }
  if (brandLower.length >= 6 && distance === 2) {
    return { matched: true, brand: brandLower, matchType: 'typosquat', score: 0.65 };
  }

  const escaped = escapeRegex(brandLower);
  if (brandLower.length >= 4) {
    const keywordPatterns = [
      new RegExp(`^${escaped}[\\-]`),
      new RegExp(`[\\-]${escaped}$`),
      new RegExp(`^${escaped}(login|secure|account|verify|update|support|help|service|online|bank|pay|auth|signin|signup)`),
      new RegExp(`(login|secure|account|verify|update|support|help|service|online|bank|pay|auth|signin|signup)${escaped}`),
    ];

    for (const pattern of keywordPatterns) {
      if (pattern.test(label)) {
        return { matched: true, brand: brandLower, matchType: 'keyword', score: 0.7 };
      }
    }

    if (label.includes(brandLower) && label !== brandLower) {
      return { matched: true, brand: brandLower, matchType: 'keyword', score: 0.6 };
    }
  }

  return null;
}

function getRegisteredDomain(domain: string): string {
  const clean = domain.replace(/^www\./, '');
  const parts = clean.split('.');
  const ccSlds = ['co', 'com', 'org', 'net', 'ac', 'gov', 'edu', 'mil', 'gen'];
  
  if (parts.length >= 3) {
    const sld = parts[parts.length - 2];
    if (ccSlds.includes(sld)) {
      return parts.slice(-3).join('.');
    }
  }
  if (parts.length >= 2) {
    return parts.slice(-2).join('.');
  }
  return clean;
}

function isLikelyLegitBrandDomain(domain: string, brandLower: string): boolean {
  const clean = domain.toLowerCase().replace(/^www\./, '');
  const regDomain = getRegisteredDomain(clean);
  const regParts = regDomain.split('.');
  const sld = regParts[0];
  
  if (sld === brandLower) return true;
  
  const parts = clean.split('.');
  for (const part of parts) {
    if (part === brandLower) return true;
  }
  
  if (sld.startsWith(brandLower)) {
    const suffix = sld.slice(brandLower.length).replace(/^-/, '');
    const suspiciousWords = ['login', 'verify', 'secure', 'account', 'auth', 'signin', 'signup', 'update', 'support', 'help', 'service', 'bank', 'pay', 'wallet', 'alert', 'confirm', 'recover', 'reset', 'suspend', 'locked', 'billing', 'invoice', 'security', 'notification', 'validate'];
    const isSuspicious = suspiciousWords.some(w => suffix.includes(w));
    if (!isSuspicious) return true;
  }
  
  if (sld.endsWith(brandLower)) {
    const prefix = sld.slice(0, -brandLower.length).replace(/-$/, '');
    const suspiciousWords = ['login', 'verify', 'secure', 'account', 'auth', 'signin', 'signup', 'update', 'support', 'help', 'service', 'bank', 'pay', 'wallet', 'alert', 'confirm', 'recover', 'reset', 'suspend', 'locked', 'billing', 'invoice', 'security', 'notification', 'validate', 'my', 'get', 'the'];
    const isSuspicious = suspiciousWords.some(w => prefix.includes(w));
    if (!isSuspicious) return true;
  }
  
  return false;
}

export function checkDomainAgainstBrand(domain: string, brand: string): MatchResult | null {
  const domainLower = domain.toLowerCase();
  const brandLower = brand.toLowerCase().replace(/\s+/g, '');
  const { base: domainBase, sld } = extractDomainParts(domainLower);

  if (isLikelyLegitBrandDomain(domainLower, brandLower)) return null;

  if (sld === brandLower) return null;

  const labels = domainBase.split('.');
  let bestResult: MatchResult | null = null;

  for (const label of labels) {
    if (label.length < 3) continue;
    if (label === brandLower) continue;
    const result = checkLabelAgainstBrand(label, brandLower);
    if (result && (!bestResult || result.score > bestResult.score)) {
      result.brand = brand;
      bestResult = result;
    }
  }

  return bestResult;
}

export function checkDomainAgainstWatchlist(domain: string, brands: string[]): MatchResult | null {
  let bestMatch: MatchResult | null = null;

  for (const brand of brands) {
    const result = checkDomainAgainstBrand(domain, brand);
    if (result && (!bestMatch || result.score > bestMatch.score)) {
      bestMatch = result;
    }
  }

  return bestMatch;
}
