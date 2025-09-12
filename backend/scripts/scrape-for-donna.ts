
/**
 * Web Scraper for Donna AI
 * 
 * This script fetches content from a list of URLs, extracts the main content, 
 * and saves it to a JSON file for ingestion into the Donna AI knowledge base.
 *
 * Dependencies: cheerio
 * To install: npm install cheerio
 * 
 * Usage:
 * tsx ./scripts/scrape-for-donna.ts <url1> <url2> ...
 */

import * as cheerio from 'cheerio';
import { writeFileSync } from 'fs';

interface ScrapedData {
  url: string;
  title: string;
  content: string;
  scrapedAt: string;
}

async function scrapeUrl(url: string): Promise<ScrapedData | null> {
  try {
    console.log(`Scraping: ${url}`);
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) {
      console.error(`Failed to fetch ${url}. Status: ${response.status}`);
      return null;
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Extract title
    const title = $('title').first().text() || $('h1').first().text();

    // Extract main content - this might need to be adjusted per site
    // Common selectors for main content are 'article', 'main', '[role="main"]', '.post-content'
    let content = $('article').text() || $('main').text();

    if (!content) {
        // Fallback to removing script and style tags and getting the body text
        $('script, style, nav, footer, header').remove();
        content = $('body').text();
    }

    // Clean up the content
    const cleanedContent = content.replace(/\s\s+/g, ' ').trim();

    return {
      url,
      title,
      content: cleanedContent,
      scrapedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error(`Error scraping ${url}:`, error);
    return null;
  }
}

async function main() {
  const urls = process.argv.slice(2);
  if (urls.length === 0) {
    console.log('Usage: tsx ./scripts/scrape-for-donna.ts <url1> <url2> ...');
    return;
  }

  console.log(`Starting scrape for ${urls.length} URL(s)...`);

  const scrapedData: ScrapedData[] = [];
  for (const url of urls) {
    const data = await scrapeUrl(url);
    if (data) {
      scrapedData.push(data);
    }
  }

  if (scrapedData.length > 0) {
    const outputFile = 'scraped-data.json';
    writeFileSync(outputFile, JSON.stringify(scrapedData, null, 2));
    console.log(`Successfully scraped ${scrapedData.length} URL(s). Data saved to ${outputFile}`);
  } else {
    console.log('No data was scraped.');
  }
}

main();
