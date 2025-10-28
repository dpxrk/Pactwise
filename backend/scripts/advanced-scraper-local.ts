/**
 * Advanced Web Scraper (Local Heuristics Version) for Donna AI - V2
 *
 * This script crawls websites with more comprehensive heuristics and optimized content extraction.
 * It does NOT use the OpenAI API.
 *
 * Dependencies: cheerio, p-queue
 * To install: npm install cheerio p-queue
 * 
 * Usage:
 * tsx ./scripts/advanced-scraper-local.ts <seedUrl1> <seedUrl2> ...
 */

import * as cheerio from 'cheerio';
import { writeFileSync, existsSync, readFileSync } from 'fs';
import PQueue from 'p-queue';

// --- CONFIGURATION ---
const CRAWL_DEPTH = 2;
const CONCURRENCY = 10;
const DELAY_MS = 100;

// --- HEURISTICS DEFINITIONS (V2 - More Comprehensive) ---
const HEURISTICS = {
  contract: {
    keywords: ['agreement', 'terms of service', 'privacy policy', 'contract', 'whereas', 'indemnify', 'liability', 'governing law', 'termination', 'confidentiality', 'arbitration', 'heretofore', 'parties', 'dpa', 'data processing addendum', 'sla', 'service level agreement', 'nda', 'non-disclosure', 'master service agreement', 'msa', 'terms and conditions'],
    negativeKeywords: ['blog', 'article', 'news', 'press release', 'careers', 'jobs', 'about us'],
    scoreThreshold: 6,
  },
  pricing: {
    keywords: ['pricing', 'plans', 'subscribe', 'buy now', 'get started', 'monthly', 'annually', 'one-time', 'per user', '/mo', '/yr', 'billing', 'subscription', 'tiers', 'compare plans', 'pay-as-you-go', 'freemium', 'enterprise plan'],
    negativeKeywords: ['blog', 'documentation', 'support', 'article', 'news', 'webinar'],
    scoreThreshold: 4,
  },
  regex: {
    effectiveDate: /(?:effective|dated|as of|commencing on)\s*(?:the\s+)?([\w\s,\-.]+(?:st|nd|rd|th)?\s+\d{1,2},?\s+\d{4}|\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4})/i,
    term: /(?:term|duration)\s+(?:of|is|shall be)\s+([\w\s\-.,()]+)/i,
    price: /(?:USD|\$|€|£|CAD|AUD)\s?(\d{1,6}(?:,\d{3})*(?:\.\d{2})?)/,
    billingCycle: /(?:per month|monthly|\/mo|per year|annually|\/yr|one-time|lifetime)/i,
  }
};

const LINK_BLACKLIST = ['linkedin.com', 'twitter.com', 'facebook.com', 'instagram.com', 'youtube.com', 'doubleclick.net', 'googleadservices.com'];

// --- DATA STRUCTURES ---
interface ScrapedContract {
  url: string;
  extractedTitle: string | null;
  effectiveDate: string | null;
  term: string | null;
}

interface ScrapedPricing {
  url: string;
  productName: string | null;
  price: string | null;
  billingCycle: string | null;
}

// --- HEURISTIC-BASED FUNCTIONS (V2) ---

function classifyContentHeuristic(text: string): string {
  const lowerText = text.toLowerCase();

  let contractScore = HEURISTICS.contract.keywords.reduce((score, keyword) => score + (lowerText.match(new RegExp(`\b${keyword}\b`, 'g')) || []).length, 0);
  contractScore -= HEURISTICS.contract.negativeKeywords.reduce((score, keyword) => score + (lowerText.match(new RegExp(`\b${keyword}\b`, 'g')) || []).length, 0);
  if (contractScore >= HEURISTICS.contract.scoreThreshold) {
    return 'contract';
  }

  let pricingScore = HEURISTICS.pricing.keywords.reduce((score, keyword) => score + (lowerText.match(new RegExp(`\b${keyword}\b`, 'g')) || []).length, 0);
  pricingScore -= HEURISTICS.pricing.negativeKeywords.reduce((score, keyword) => score + (lowerText.match(new RegExp(`\b${keyword}\b`, 'g')) || []).length, 0);
  if (pricingScore >= HEURISTICS.pricing.scoreThreshold) {
    return 'pricing';
  }

  return 'other';
}

function extractMainContent($: cheerio.CheerioAPI): string {
    $('script, style, nav, footer, header, aside, form, [role="navigation"], [role="search"]').remove();
    let bestElement: cheerio.Element | null = null;
    let maxScore = -1;

    $('div, section, article, main').each((_: number, el: cheerio.Element) => {
        const text = $(el).text();
        const textLength = text.length;
        const linkDensity = $(el).find('a').length / (textLength + 1);
        const score = textLength * (1 - linkDensity);

        if (score > maxScore) {
            maxScore = score;
            bestElement = el;
        }
    });

    return bestElement ? $(bestElement).text().replace(/\s\s+/g, ' ').trim() : $('body').text().replace(/\s\s+/g, ' ').trim();
}

function extractContractDataHeuristic(text: string, url: string): ScrapedContract {
  return {
    url,
    extractedTitle: text.substring(0, 120).trim(),
    effectiveDate: text.match(HEURISTICS.regex.effectiveDate)?.[1]?.trim() || null,
    term: text.match(HEURISTICS.regex.term)?.[1]?.trim() || null,
  };
}

function extractPricingDataHeuristic(html: string, url: string): ScrapedPricing[] {
    const $ = cheerio.load(html);
    const pricingData: ScrapedPricing[] = [];

    $('div, section, li, table').find(':contains("$"), :contains("€"), :contains("£")').each((_: number, el: cheerio.Element) => {
        const container = $(el).closest('div, section, li, tr');
        const text = container.text();
        const priceMatch = text.match(HEURISTICS.regex.price);
        const cycleMatch = text.match(HEURISTICS.regex.billingCycle);

        if (priceMatch) {
            let productName = container.find('h1, h2, h3, h4, .plan-name, .tier-title').first().text().trim();
            if (!productName) {
                productName = container.closest('div, section').find('h1, h2, h3, h4').first().text().trim();
            }

            pricingData.push({
                url,
                productName: productName || 'Unknown Product',
                price: priceMatch[1],
                billingCycle: cycleMatch ? cycleMatch[0] : 'unknown',
            });
        }
    });

    return [...new Map(pricingData.map(item => [`${item.productName}-${item.price}`, item])).values()];
}

// --- CRAWLER CLASS (V2) ---

class Crawler {
  private queue = new PQueue({ concurrency: CONCURRENCY });
  private visited = new Set<string>();
  private contracts: ScrapedContract[] = [];
  private pricing: ScrapedPricing[] = [];

  constructor() {
    this.loadResults();
  }

  private loadResults() {
    if (existsSync('contracts-local.json')) {
      this.contracts = JSON.parse(readFileSync('contracts-local.json', 'utf-8'));
      this.contracts.forEach(c => this.visited.add(c.url));
    }
    if (existsSync('pricing_data-local.json')) {
      this.pricing = JSON.parse(readFileSync('pricing_data-local.json', 'utf-8'));
      const pricingUrls = new Set(this.pricing.map(p => p.url));
      pricingUrls.forEach(u => this.visited.add(u));
    }
    console.log(`Loaded ${this.contracts.length} contracts and ${this.pricing.length} pricing items from previous runs.`);
  }

  private saveResults() {
    writeFileSync('contracts-local.json', JSON.stringify(this.contracts, null, 2));
    writeFileSync('pricing_data-local.json', JSON.stringify(this.pricing, null, 2));
    console.log('\nResults saved to contracts-local.json and pricing_data-local.json!');
  }

  async crawl(url: string, depth: number) {
    try {
        const urlObj = new URL(url);
        const normalizedUrl = urlObj.href;

        if (depth > CRAWL_DEPTH || this.visited.has(normalizedUrl) || LINK_BLACKLIST.some(domain => urlObj.hostname.includes(domain))) {
            return;
        }
        this.visited.add(normalizedUrl);
        console.log(`[Depth ${depth}] Visiting: ${normalizedUrl}`);

        await this.queue.add(async () => {
            try {
                const response = await fetch(normalizedUrl, { headers: { 'User-Agent': 'DonnaAI-Crawler/1.0' } });
                if (!response.ok || !response.headers.get('content-type')?.includes('text/html')) {
                    return;
                }
                const html = await response.text();
                const $ = cheerio.load(html);
                const mainText = extractMainContent($);

                const classification = classifyContentHeuristic(mainText);
                console.log(`  -> Classified as: ${classification}`);

                if (classification === 'contract') {
                    const contractData = extractContractDataHeuristic(mainText, normalizedUrl);
                    this.contracts.push(contractData);
                } else if (classification === 'pricing') {
                    const pricingData = extractPricingDataHeuristic(html, normalizedUrl);
                    if (pricingData.length > 0) {
                        this.pricing.push(...pricingData);
                    }
                }

                if (depth < CRAWL_DEPTH) {
                    $('a').each((_: number, el: cheerio.Element) => {
                        const link = $(el).attr('href');
                        if (link) {
                            try {
                                const absoluteUrl = new URL(link, normalizedUrl).href;
                                this.crawl(absoluteUrl, depth + 1);
                            } catch {}
                        }
                    });
                }

            } catch (error) {
                // Ignore fetch/processing errors for individual URLs
            }
            await new Promise(resolve => setTimeout(resolve, DELAY_MS));
        });
    } catch (error) {
        console.log(`Invalid URL: ${url}`)
    }
  }

  async start(seedUrls: string[]) {
    console.log('Starting enhanced local heuristic crawl...');
    for (const url of seedUrls) {
      this.crawl(url, 0);
    }
    await this.queue.onIdle();
    this.saveResults();
  }
}

// --- MAIN EXECUTION ---

async function main() {
  const seedUrls = process.argv.slice(2);
  if (seedUrls.length === 0) {
    console.log('Usage: tsx ./scripts/advanced-scraper-local.ts <seedUrl1> <seedUrl2> ...');
    return;
  }

  const crawler = new Crawler();
  await crawler.start(seedUrls);
}

main();