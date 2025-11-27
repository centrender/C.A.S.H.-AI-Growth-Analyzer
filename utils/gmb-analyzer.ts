import { GMBProfile } from '@/types';
import * as cheerio from 'cheerio';

/**
 * Analyzes the Google My Business profile for a given website.
 * Follows a hierarchy:
 * 1. Direct Link Extraction (from HTML)
 * 2. API Search (Placeholder)
 */
export async function analyzeGMB(html: string, businessName: string): Promise<GMBProfile> {
    // 1. Method A: Direct Link Extraction
    const directLink = findGMBLink(html);
    if (directLink) {
        // In a real app, we would then scrape this GMB URL or use the Place ID from it.
        // For this V8 implementation, we will simulate fetching data from this link.
        return simulateGMBData(directLink, 'DIRECT_LINK');
    }

    // 2. Method B: API Search (Placeholder)
    // Only if direct link is not found
    return await searchGMBViaAPI(businessName);
}

/**
 * Scans HTML for Google Maps/Business links
 */
function findGMBLink(html: string): string | null {
    const $ = cheerio.load(html);
    let foundLink: string | null = null;

    // Search all anchor tags
    $('a').each((_, element) => {
        const href = $(element).attr('href');
        if (href) {
            if (
                href.includes('maps.google.com') ||
                href.includes('g.page') ||
                href.includes('google.com/maps')
            ) {
                foundLink = href;
                return false; // Break loop
            }
        }
    });

    return foundLink;
}

/**
 * Placeholder for Google Places API search
 */
async function searchGMBViaAPI(businessName: string): Promise<GMBProfile> {
    // In a real implementation, this would call:
    // https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${businessName}&inputtype=textquery&fields=place_id&key=${process.env.MAPS_API_KEY}

    // For V8 demo purposes, we will simulate a "Not Found" or "Found" based on randomness or specific keywords
    // to allow the user to test both scenarios.

    // If business name contains "test", we simulate a perfect profile
    if (businessName.toLowerCase().includes('test')) {
        return {
            found: true,
            name: businessName,
            url: 'https://maps.google.com/?q=test',
            rating: 4.9,
            reviewCount: 150,
            lastReviewDate: new Date().toISOString(), // Today
            responseRate: 100,
            photosCount: 25,
            claimed: true,
            method: 'API_SEARCH',
            score: 98
        };
    }

    // Default: Return "Not Found" to trigger the "Critical Authority Signal Missing" state
    // as requested by the user to show the "Reputation Resurrection" offer.
    return {
        found: false,
        method: 'NOT_FOUND',
        score: 0
    };
}

/**
 * Simulates fetching data from a found GMB link
 */
function simulateGMBData(url: string, method: 'DIRECT_LINK'): GMBProfile {
    // Simulate a "Good but not perfect" profile
    const rating = 4.2;
    const reviewCount = 25;
    const lastReviewDate = new Date(Date.now() - 1000 * 60 * 60 * 24 * 45).toISOString(); // 45 days ago
    const responseRate = 20; // Low response rate

    const score = calculateGMBScore(rating, reviewCount, lastReviewDate, responseRate);

    return {
        found: true,
        url,
        name: 'Detected Business',
        rating,
        reviewCount,
        lastReviewDate,
        responseRate,
        photosCount: 5,
        claimed: true,
        method,
        score
    };
}

/**
 * Calculates the internal GMB score (0-100)
 */
function calculateGMBScore(
    rating: number,
    reviewCount: number,
    lastReviewDate: string,
    responseRate: number
): number {
    let score = 0;

    // 1. Rating (30 points)
    if (rating >= 4.8) score += 30;
    else if (rating >= 4.5) score += 25;
    else if (rating >= 4.0) score += 15;
    else score += 5;

    // 2. Volume (30 points)
    if (reviewCount >= 100) score += 30;
    else if (reviewCount >= 50) score += 20;
    else if (reviewCount >= 20) score += 10;
    else score += 0;

    // 3. Recency (20 points)
    const daysSinceReview = (Date.now() - new Date(lastReviewDate).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceReview <= 7) score += 20;
    else if (daysSinceReview <= 30) score += 15;
    else if (daysSinceReview <= 90) score += 5;
    else score += 0;

    // 4. Response Rate (20 points)
    if (responseRate >= 90) score += 20;
    else if (responseRate >= 50) score += 10;
    else score += 0;

    return score;
}
