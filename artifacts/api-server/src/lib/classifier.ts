const URL_SHORTENERS = [
  "bit.ly", "tinyurl.com", "t.co", "goo.gl", "is.gd", "v.gd",
  "buff.ly", "ow.ly", "rb.gy", "shorturl.at", "tiny.cc",
];

const BRAND_PATTERNS = [
  { brand: "google", patterns: ["g00gle", "gogle", "googel", "g0ogle", "googlé"] },
  { brand: "microsoft", patterns: ["micros0ft", "micosoft", "microsft", "m1crosoft"] },
  { brand: "paypal", patterns: ["paypa1", "paypai", "paypaI", "peypal"] },
  { brand: "amazon", patterns: ["amaz0n", "amazom", "amazón", "arnazon"] },
  { brand: "apple", patterns: ["app1e", "appie", "applé", "aplle"] },
  { brand: "netflix", patterns: ["netfl1x", "netfllx", "n3tflix"] },
  { brand: "facebook", patterns: ["faceb00k", "fecebook", "faceb0ok"] },
];

export function classifyAttackType(url: string, metadata?: { source?: string }): string {
  const lowerUrl = url.toLowerCase();

  try {
    const parsed = new URL(url.replace(/^hxxps?/i, "https"));
    const hostname = parsed.hostname.replace(/[\[\]]/g, "");

    if (URL_SHORTENERS.some(s => hostname.includes(s)) || lowerUrl.length < 40) {
      return "Obfuscated Link";
    }

    for (const { patterns } of BRAND_PATTERNS) {
      if (patterns.some(p => hostname.includes(p) || lowerUrl.includes(p))) {
        return "Brand Impersonation";
      }
    }
  } catch {}

  if (/login|signin|sign-in|verify|account|secure|auth|password/i.test(lowerUrl)) {
    return "Credential Harvest";
  }

  if (/invoice|payment|receipt|order|billing|transaction/i.test(lowerUrl)) {
    return "Invoice Fraud";
  }

  if (/gift.?card|ceo|exec|wire.?transfer|itunes|google.?play|steam.?card/i.test(lowerUrl)) {
    return "CEO Fraud / BEC";
  }

  if (/qr|\.svg|pdf/i.test(lowerUrl)) {
    return "QR Phishing";
  }

  return "Generic Phishing";
}

const SECTOR_PATTERNS: Record<string, RegExp> = {
  banking: /bank|chase|wells.?fargo|citi|hsbc|finance|credit|debit|loan|paypal|venmo|zelle|stripe|square|mastercard|visa|amex|revolut|wise|transferwise|capitalone|barclays|santander|ing\b|bnp|natwest|lloyds|halifax|monzo|n26|sofi|chime|cash.?app|pnc|usaa|schwab|fidelity|td.?bank|bmo|scotiabank|rbc|cibc|westpac|anz|nab|commbank|dbs|ocbc|uob/i,
  healthcare: /health|medical|pharma|hospital|clinic|patient|medicare|medicaid|aetna|cigna|humana|kaiser|unitedhealth|anthem|prescription|doctor|nhs|vaccine/i,
  tech: /google|microsoft|apple|amazon|meta|facebook|twitter|github|cloud|icloud|onedrive|dropbox|zoom|slack|teams|outlook|office365|o365|linkedin|instagram|whatsapp|telegram|signal|discord|tiktok|snapchat|pinterest|reddit|yahoo|aol|hotmail|gmail|proton|adobe|salesforce|oracle|sap|vmware|cisco|dell|hp\b|lenovo|samsung|sony|nvidia|intel|netflix|spotify|hulu|disney|steam|epic.?games|playstation|xbox|nintendo|webmail|cpanel|plesk|wordpress|joomla|drupal/i,
  retail: /shop|store|ebay|walmart|target|order|delivery|package|shipping|fedex|ups\b|usps|dhl|post|parcel|amazon|aliexpress|allegro|mercado|rakuten|etsy|wayfair|bestbuy|costco|ikea|zara|h&m|shein|temu|wish|invoice|receipt|tracking|refund|return/i,
  government: /gov|\.gov\.|gob|irs|tax|fbi|cia|passport|social.?security|dmv|customs|immigration|visa.?application|embassy|consulate|police|court|military|census|election|veteran|benefits|unemployment|stimulus/i,
  crypto: /crypto|bitcoin|ethereum|wallet|blockchain|nft|defi|binance|coinbase|kraken|gemini|bitfinex|bitstamp|kucoin|okx|bybit|gate\.io|metamask|ledger|trezor|phantom|solana|cardano|polkadot|avalanche|polygon|uniswap|opensea|mining|airdrop|token/i,
};

export function classifySector(url: string): string | null {
  const lowerUrl = url.toLowerCase();
  for (const [sector, regex] of Object.entries(SECTOR_PATTERNS)) {
    if (regex.test(lowerUrl)) {
      return sector;
    }
  }
  return null;
}

export function sanitizeUrl(rawUrl: string): string {
  let sanitized = rawUrl.replace(/^https/gi, "hxxps").replace(/^http/gi, "hxxp");
  try {
    const parsed = new URL(rawUrl);
    const host = `[${parsed.hostname}]`;
    sanitized = sanitized.replace(parsed.hostname, host);
  } catch {}
  return sanitized;
}
