import * as cheerio from 'cheerio';
import { ScrapedContent } from '@/types';

export async function scrapeUrl(url: string): Promise<ScrapedContent> {
  try {
    // Fetch the page
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
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
    throw new Error(`Scraping failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

