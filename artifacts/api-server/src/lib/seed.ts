import { db, phishEntriesTable, attackTypesTable } from "@workspace/db";
import { logger } from "./logger";
import { count } from "drizzle-orm";

const ATTACK_TYPE_SEEDS = [
  {
    name: "Credential Harvest",
    description: "Attackers create convincing replicas of login pages to steal usernames and passwords. These pages often mimic trusted services like email providers, banks, or cloud platforms.",
    monthsAgo: 18,
    simulationHtml: "credential-harvest",
  },
  {
    name: "Brand Impersonation",
    description: "Phishing campaigns that closely mimic the branding, logos, and communication style of well-known companies. Victims are tricked into trusting fraudulent messages that appear to come from legitimate brands.",
    monthsAgo: 16,
    simulationHtml: "brand-impersonation",
  },
  {
    name: "Invoice Fraud",
    description: "Fraudulent emails or messages containing fake invoices, payment requests, or order confirmations designed to trick victims into sending money or revealing financial information.",
    monthsAgo: 14,
    simulationHtml: "invoice-fraud",
  },
  {
    name: "QR Phishing",
    description: "Also known as QRshing, this technique uses malicious QR codes embedded in emails, documents, or physical media to redirect victims to phishing pages that bypass traditional URL filters.",
    monthsAgo: 10,
    simulationHtml: null,
  },
  {
    name: "Smishing",
    description: "SMS-based phishing that delivers malicious links via text messages. These often impersonate delivery services, banks, or government agencies and exploit the trust people place in SMS.",
    monthsAgo: 12,
    simulationHtml: "smishing",
  },
  {
    name: "AI-Generated Spear Phishing",
    description: "Highly targeted phishing emails generated using AI language models. These messages are personalized, grammatically flawless, and can adapt their tone to match the target's communication style.",
    monthsAgo: 0.5,
    simulationHtml: null,
  },
  {
    name: "Browser-in-the-Browser",
    description: "A sophisticated attack that creates a fake browser popup window within the real browser, complete with a convincing URL bar showing a legitimate domain. Victims believe they are entering credentials into a real authentication window.",
    monthsAgo: 0.3,
    simulationHtml: null,
  },
  {
    name: "Adversary-in-the-Middle",
    description: "Real-time proxy attacks that sit between the victim and the legitimate service, capturing authentication tokens and session cookies as they pass through. This technique can bypass most forms of multi-factor authentication.",
    monthsAgo: 0.2,
    simulationHtml: null,
  },
  {
    name: "CEO Fraud / BEC",
    description: "Business Email Compromise where attackers impersonate executives or managers, typically targeting new employees. Common tactics include urgent requests for gift cards, wire transfers, or sensitive data. Often triggered by monitoring LinkedIn for new hire announcements.",
    monthsAgo: 20,
    simulationHtml: "ceo-fraud",
  },
];

const FAKE_DOMAINS = [
  "[secure-update.xyz]", "[my-account-verify.com]", "[login-portal.net]",
  "[payment-confirm.org]", "[invoice-review.co]", "[package-track.info]",
  "[cloud-auth.net]", "[wallet-sync.io]", "[bank-alert.com]",
  "[document-share.xyz]", "[verify-identity.net]", "[order-status.co]",
  "[support-ticket.org]", "[account-recovery.info]", "[shipping-update.com]",
];

const SECTORS = ["banking", "healthcare", "tech", "retail", "government", "crypto", null];
const COUNTRIES = ["US", "RU", "CN", "BR", "IN", "DE", "GB", "NG", "UA", "KR", null];
const SOURCES = ["openphish", "urlhaus", "phishtank"];

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDate(daysBack: number): Date {
  const now = new Date();
  const offset = Math.floor(Math.random() * daysBack);
  return new Date(now.getTime() - offset * 24 * 60 * 60 * 1000);
}

export async function seedDatabase(): Promise<void> {
  const [attackCount] = await db.select({ value: count() }).from(attackTypesTable);
  if (attackCount.value > 0) {
    logger.info("Database already seeded, skipping");
    return;
  }

  logger.info("Seeding database...");

  for (const seed of ATTACK_TYPE_SEEDS) {
    const firstSeen = new Date();
    firstSeen.setMonth(firstSeen.getMonth() - seed.monthsAgo);

    await db.insert(attackTypesTable).values({
      name: seed.name,
      description: seed.description,
      firstSeen,
      sampleCount: Math.floor(Math.random() * 500) + 50,
      simulationHtml: seed.simulationHtml,
    });
  }

  const attackTypeNames = ATTACK_TYPE_SEEDS.map(s => s.name);

  for (let i = 0; i < 50; i++) {
    const domain = randomElement(FAKE_DOMAINS);
    const path = `/${Math.random().toString(36).substring(2, 8)}`;
    const protocol = Math.random() > 0.3 ? "hxxps" : "hxxp";

    await db.insert(phishEntriesTable).values({
      url: `${protocol}://${domain}${path}`,
      source: randomElement(SOURCES),
      attackType: randomElement(attackTypeNames),
      sector: randomElement(SECTORS),
      country: randomElement(COUNTRIES),
      dateDetected: randomDate(30),
      confidenceScore: Math.round((Math.random() * 0.5 + 0.5) * 100) / 100,
      isActive: Math.random() > 0.1,
    });
  }

  logger.info("Database seeded with attack types and 50 phish entries");
}
