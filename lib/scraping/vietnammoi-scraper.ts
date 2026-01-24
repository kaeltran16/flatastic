import * as cheerio from 'cheerio';
import { parseWithLLM } from '@/lib/services/llm';

export interface WaterOutage {
  district: string;
  timeRange: string;
  affectedAreas: string[];
  startDate: Date;
  endDate: Date;
}

interface ParsedOutageData {
  hasBinhThanhOutage: boolean;
  timeRange?: string;
  affectedAreas?: string[];
  startDateTime?: string; // Format: "YYYY-MM-DD HH:mm"
  endDateTime?: string;   // Format: "YYYY-MM-DD HH:mm"
}

/**
 * Find the latest water outage article URL from vietnammoi.vn
 * Searches for articles with "lịch cúp nước" in the title
 */
async function findLatestWaterOutageArticleUrl(): Promise<string | null> {
  try {
    // Try searching for water outage articles
    const searchUrl = 'https://vietnammoi.vn/tim-kiem?q=lich+cup+nuoc+tp+hcm';

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(searchUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error('Failed to fetch search page:', response.status);
      return null;
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Look for article links containing "lich-cup-nuoc"
    const articleLinks = $('a[href*="lich-cup-nuoc"]');

    if (articleLinks.length === 0) {
      console.log('No water outage articles found in search results');
      return null;
    }

    // Get the first (most recent) article URL
    const firstLink = articleLinks.first();
    let articleUrl = firstLink.attr('href');

    if (!articleUrl) {
      return null;
    }

    // Make sure URL is absolute
    if (articleUrl.startsWith('/')) {
      articleUrl = `https://vietnammoi.vn${articleUrl}`;
    }

    console.log('Found latest water outage article:', articleUrl);
    return articleUrl;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.error('Timeout while searching for water outage articles');
    } else {
      console.error('Error finding latest water outage article:', error.message);
    }
    return null;
  }
}

/**
 * Parse ISO datetime string to Date object
 * Format: "YYYY-MM-DD HH:mm"
 */
function parseISODateTime(dateTimeStr: string): Date | null {
  try {
    const [datePart, timePart] = dateTimeStr.split(' ');
    const [year, month, day] = datePart.split('-').map(Number);
    const [hour, minute] = timePart.split(':').map(Number);

    return new Date(year, month - 1, day, hour, minute);
  } catch (error: any) {
    console.error('Error parsing datetime:', dateTimeStr, error.message);
    return null;
  }
}

/**
 * Scrape water outage data for Binh Thanh district from a given article URL
 * Uses LLM to parse the article content for robust extraction
 */
async function scrapeWaterOutagesForBinhThanh(articleUrl: string): Promise<WaterOutage | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(articleUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error('Failed to fetch article:', response.status);
      return null;
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Extract main article content (remove scripts, styles, nav, footer, etc.)
    $('script, style, nav, footer, header, .advertisement, .ads').remove();

    // Get article title
    const title = $('h1').first().text().trim();

    // Get article body text (prefer article tag, or main content)
    let articleText = '';
    const articleElement = $('article, .article-content, .content, main').first();

    if (articleElement.length > 0) {
      articleText = articleElement.text();
    } else {
      // Fallback to body text
      articleText = $('body').text();
    }

    // Clean up excessive whitespace
    articleText = articleText.replace(/\s+/g, ' ').trim();

    if (!articleText || articleText.length < 100) {
      console.error('Article text too short or empty');
      return null;
    }

    console.log('Article title:', title);
    console.log('Article text length:', articleText.length);

    // Validate this is a water outage article
    if (!title.toLowerCase().includes('cúp nước') && !articleText.toLowerCase().includes('cúp nước')) {
      console.log('Article does not appear to be about water outages');
      return null;
    }

    // Use LLM to parse water outage data for Binh Thanh district
    const instructions = `
Extract water outage information for Bình Thạnh district (quận Bình Thạnh) from this Vietnamese article.

Return JSON with this exact structure:
{
  "hasBinhThanhOutage": true/false,
  "timeRange": "original Vietnamese time range text (e.g., 'từ 22g00 ngày 17/01/2026 đến 05g00 ngày 18/01/2026')",
  "affectedAreas": ["list", "of", "affected", "areas"],
  "startDateTime": "YYYY-MM-DD HH:mm",
  "endDateTime": "YYYY-MM-DD HH:mm"
}

Important:
- Only extract data for Bình Thạnh district (not other districts)
- Parse Vietnamese date format DD/MM/YYYY and time format HHgMM
- Convert to ISO format YYYY-MM-DD HH:mm
- If no Bình Thạnh data found, set hasBinhThanhOutage to false
- affectedAreas should be street names, neighborhoods, or areas mentioned
`;

    const parsedData = await parseWithLLM<ParsedOutageData>(
      `Title: ${title}\n\nContent: ${articleText.substring(0, 8000)}`, // Limit to ~8k chars to avoid token limits
      instructions,
      {
        model:
          process.env.OPENROUTER_SCRAPER_MODEL ||
          process.env.OPENROUTER_DEFAULT_MODEL ||
          'anthropic/claude-3.5-sonnet',
        temperature: 0.3,
      }
    );

    if (!parsedData || !parsedData.hasBinhThanhOutage) {
      console.log('No Binh Thanh water outage found in article');
      return null;
    }

    if (!parsedData.startDateTime || !parsedData.endDateTime) {
      console.error('LLM did not return valid date/time data');
      return null;
    }

    // Parse dates
    const startDate = parseISODateTime(parsedData.startDateTime);
    const endDate = parseISODateTime(parsedData.endDateTime);

    if (!startDate || !endDate) {
      console.error('Failed to parse dates from LLM response');
      return null;
    }

    return {
      district: 'Bình Thạnh',
      timeRange: parsedData.timeRange || `${parsedData.startDateTime} đến ${parsedData.endDateTime}`,
      affectedAreas: parsedData.affectedAreas && parsedData.affectedAreas.length > 0
        ? parsedData.affectedAreas
        : ['Khu vực chưa được xác định'],
      startDate,
      endDate,
    };
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.error('Timeout while scraping article');
    } else {
      console.error('Error scraping water outages for Binh Thanh:', error.message);
    }
    return null;
  }
}

/**
 * Main function to get the latest Binh Thanh water outage
 * Combines article discovery and scraping
 */
export async function getLatestBinhThanhWaterOutage(): Promise<WaterOutage | null> {
  try {
    // First, find the latest article URL
    const articleUrl = await findLatestWaterOutageArticleUrl();

    if (!articleUrl) {
      console.log('Could not find latest water outage article');
      return null;
    }

    // Then scrape the article for Binh Thanh data
    const outage = await scrapeWaterOutagesForBinhThanh(articleUrl);

    if (outage) {
      console.log('Successfully scraped Binh Thanh water outage:', {
        timeRange: outage.timeRange,
        startDate: outage.startDate.toISOString(),
        endDate: outage.endDate.toISOString(),
        affectedAreasCount: outage.affectedAreas.length,
      });
    }

    return outage;
  } catch (error: any) {
    console.error('Error in getLatestBinhThanhWaterOutage:', error.message);
    return null;
  }
}
