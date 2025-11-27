import * as cheerio from 'cheerio';
import { ScrapedContent } from '@/types';

export async function scrapeUrl(url: string): Promise<ScrapedContent> {
  try {
    // Fetch the page
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Extract title
    const title = $('title').text().trim() || $('h1').first().text().trim() || 'No title found';

    // Extract all headings (h1-h6)
    const headings: string[] = [];
    $('h1, h2, h3, h4, h5, h6').each((_, element) => {
      const headingText = $(element).text().trim();
      if (headingText) {
        headings.push(headingText);
      }
    });

    // Remove script and style elements before extracting text
    $('script, style, nav, footer, header, aside').remove();

    // Extract main text content
    const text = $('body').text()
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 10000); // Limit to 10k characters

    return {
      title,
      headings,
      text,
      url,
      html, // Include raw HTML for signal detection
    };
  } catch (error) {
    console.warn(`Scraping failed for ${url}:`, error);

    // Fallback: If scraping fails (e.g. 403 Forbidden), return a minimal object
    // so the analysis can proceed based on the URL/Domain alone.
    return {
      title: new URL(url).hostname,
      headings: [],
      text: `Scraping failed for ${url}. Analyzing based on domain name and external signals.`,
      url,
      html: '',
    };
  }
}

