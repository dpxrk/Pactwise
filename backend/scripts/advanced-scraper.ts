/**
 * Advanced Web Scraper and Crawler for Donna AI
 *
 * This script crawls websites starting from seed URLs, uses AI to classify page content,
 * and extracts structured data for contracts and pricing trends.
 *
 * Dependencies: cheerio, openai, p-queue
 * To install: npm install cheerio openai p-queue
 * 
 * Usage:
 * OPENAI_API_KEY='your_key' tsx ./scripts/advanced-scraper.ts <seedUrl1> <seedUrl2> ...
 */

import * as cheerio from 'cheerio';
import { writeFileSync, existsSync, readFileSync } from 'fs';
import OpenAI from 'openai';
import PQueue from 'p-queue';

// --- CONFIGURATION ---
const CRAWL_DEPTH = 2; // How many links deep to follow from the seed URLs
const CONCURRENCY = 5; // Number of parallel requests
const DELAY_MS = 500; // Delay between requests to be polite
const OPENAI_MODEL = 'gpt-4-turbo-preview'; // Or 'gpt-3.5-turbo' for faster, cheaper runs

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// --- DATA STRUCTURES ---
interface ScrapedContract {
  url: string;
  parties: string[] | null;
  effective_date: string | null;
  term: string | null;
  payment_terms: string | null;
  liability_clause: string | null;
  termination_clause: string | null;
}

interface ScrapedPricing {
  url: string;
  product: string;
  price: number;
  currency: string;
  cycle: string;
}

// --- AI-POWERED FUNCTIONS ---

async function classifyContent(text: string): Promise<string> {
  if (!text || text.trim().length < 100) {
    return 'none'; // Not enough content to classify
  }

  try {
    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        {
          role: 'system',
          content: "Analyze the following text from a webpage. Classify its primary content into one of the following categories: 'contract', 'pricing', 'other', 'none'. A 'contract' is a legal agreement. 'pricing' refers to a page listing products/services with prices. 'other' is for meaningful content that is not a contract or pricing. 'none' is for irrelevant content like navigation pages, error pages, or empty pages. Respond with only one word: 'contract', 'pricing', 'other', or 'none'.",
        },
        {
          role: 'user',
          content: text.substring(0, 8000), // Use a substring to stay within token limits
        },
      ],
      temperature: 0,
    });
    return response.choices[0].message.content?.trim() || 'none';
  } catch (error) {
    console.error('Error in AI classification:', error);
    return 'none';
  }
}

async function extractContractData(text: string, url: string): Promise<ScrapedContract | null> {
  try {
    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: "From the following text, which is believed to be a legal contract, extract the following information: the parties involved, the effective date, the term or duration, and any clauses related to payment terms, liability, and termination. Return the data as a single JSON object. If a piece of information is not found, set its value to null. Example: {\"parties\": [\"Company A\", \"Company B\"], \"effective_date\": \"2023-01-01\", \"term\": \"1 year\", \"payment_terms\": \"Net 30\", \"liability_clause\": \"...\", \"termination_clause\": \"...\"}",
        },
        {
          role: 'user',
          content: text,
        },
      ],
    });
    const data = JSON.parse(response.choices[0].message.content || '{}');
    return { url, ...data };
  } catch (error) {
    console.error('Error in contract extraction:', error);
    return null;
  }
}

async function extractPricingData(text: string, url: string): Promise<ScrapedPricing[]> {
    try {
      const response = await openai.chat.completions.create({
        model: OPENAI_MODEL,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: "From the following text, extract all available pricing information. For each item, identify the product/service name, price, currency (use ISO 4217 code, e.g., USD), and the billing cycle (e.g., 'monthly', 'annually', 'one-time'). Return the data as a JSON object with a single key 'pricing' which is an array of objects. If no pricing information is found, return an empty array. Example: {\"pricing\": [{\"product\": \"Basic Plan\", \"price\": 29.99, \"currency\": \"USD\", \"cycle\": \"monthly\"}]}",
          },
          {
            role: 'user',
            content: text.substring(0, 12000),
          },
        ],
      });
      const result = JSON.parse(response.choices[0].message.content || '{}');
      return result.pricing?.map((p: any) => ({ url, ...p })) || [];
    } catch (error) {
      console.error('Error in pricing extraction:', error);
      return [];
    }
  }

// --- CRAWLER CLASS ---

class Crawler {
  private queue = new PQueue({ concurrency: CONCURRENCY });
  private visited = new Set<string>();
  private contracts: ScrapedContract[] = [];
  private pricing: ScrapedPricing[] = [];

  constructor() {
    this.loadResults();
  }

  private loadResults() {
    if (existsSync('contracts.json')) {
      this.contracts = JSON.parse(readFileSync('contracts.json', 'utf-8'));
      this.contracts.forEach(c => this.visited.add(c.url));
    }
    if (existsSync('pricing_data.json')) {
      this.pricing = JSON.parse(readFileSync('pricing_data.json', 'utf-8'));
      // Adding to visited is tricky as one URL can have multiple pricing items
      const pricingUrls = new Set(this.pricing.map(p => p.url));
      pricingUrls.forEach(u => this.visited.add(u));
    }
    console.log(`Loaded ${this.contracts.length} contracts and ${this.pricing.length} pricing items from previous runs.`);
    console.log(`${this.visited.size} URLs already visited.`);
  }

  private saveResults() {
    writeFileSync('contracts.json', JSON.stringify(this.contracts, null, 2));
    writeFileSync('pricing_data.json', JSON.stringify(this.pricing, null, 2));
    console.log('\nResults saved!');
  }

  async crawl(url: string, depth: number) {
    const normalizedUrl = new URL(url).href;
    if (depth > CRAWL_DEPTH || this.visited.has(normalizedUrl)) {
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
        $('script, style, nav, footer, header').remove();
        const text = $('body').text().replace(/\s\s+/g, ' ').trim();

        const classification = await classifyContent(text);
        console.log(`  -> Classified as: ${classification}`);

        if (classification === 'contract') {
          const contractData = await extractContractData(text, normalizedUrl);
          if (contractData) {
            this.contracts.push(contractData);
            console.log(`  -> Extracted contract data.`);
          }
        } else if (classification === 'pricing') {
          const pricingData = await extractPricingData(text, normalizedUrl);
          if (pricingData.length > 0) {
            this.pricing.push(...pricingData);
            console.log(`  -> Extracted ${pricingData.length} pricing items.`);
          }
        }

        // Follow links
        const links = $('a').map((_, el) => $(el).attr('href')).get();
        for (const link of links) {
          try {
            const absoluteUrl = new URL(link, normalizedUrl).href;
            if (absoluteUrl.startsWith('http')) {
              this.crawl(absoluteUrl, depth + 1);
            }
          } catch {}
        }

      } catch (error) {
        console.error(`Failed to process ${normalizedUrl}:`, error);
      }
      await new Promise(resolve => setTimeout(resolve, DELAY_MS));
    });
  }

  async start(seedUrls: string[]) {
    for (const url of seedUrls) {
      this.crawl(url, 0);
    }
    await this.queue.onIdle();
    this.saveResults();
  }
}

// --- MAIN EXECUTION ---

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY environment variable is not set.');
    return;
  }

  const seedUrls = process.argv.slice(2);
  if (seedUrls.length === 0) {
    console.log('Usage: OPENAI_API_KEY=... tsx ./scripts/advanced-scraper.ts <seedUrl1> <seedUrl2> ...');
    return;
  }

  const crawler = new Crawler();
  await crawler.start(seedUrls);
}

main();
