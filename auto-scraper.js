/**
 * Auto RSS Scraper for Government Scheme Updates
 * This module scrapes RSS feeds from government websites and updates scheme information
 * Run automatically on server startup and periodically thereafter
 */

import Parser from 'rss-parser';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const parser = new Parser({
  timeout: 15000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/rss+xml, application/xml, text/xml, */*',
    'Accept-Language': 'en-US,en;q=0.9,hi;q=0.8'
  }
});

// RSS Feed Sources for Government Schemes
// Using multiple sources for better coverage
const RSS_SOURCES = [
  {
    name: 'India Agriculture News',
    url: 'https://news.google.com/rss/search?q=indian+agriculture+farmer+scheme+government&hl=en-IN&gl=IN&ceid=IN:en',
    category: 'news',
    ministry: 'Agriculture'
  },
  {
    name: 'PM-KISAN Updates',
    url: 'https://news.google.com/rss/search?q=PM-KISAN+farmer+scheme&hl=en-IN&gl=IN&ceid=IN:en',
    category: 'scheme',
    ministry: 'Agriculture'
  },
  {
    name: 'Farmer Scheme Hindi News',
    url: 'https://news.google.com/rss/search?q=%E0%A4%95%E0%A4%BF%E0%A4%B8%E0%A4%BE%E0%A4%A8+%E0%A4%AF%E0%A5%8B%E0%A4%9C%E0%A4%A8%E0%A4%BE+%E0%A4%B8%E0%A4%B0%E0%A4%95%E0%A4%BE%E0%A4%B0%E0%A5%80&hl=hi&gl=IN&ceid=IN:hi',
    category: 'news',
    ministry: 'Agriculture'
  }
];

// Scheme-specific keywords to match updates
const SCHEME_KEYWORDS = {
  'pm-kisan': ['PM-KISAN', 'PM KISAN', 'Kisan Samman', 'किसान सम्मान', 'farmer income support'],
  'pmfby': ['PMFBY', 'Fasal Bima', 'crop insurance', 'फसल बीमा'],
  'pmksy': ['PMKSY', 'Krishi Sinchayee', 'irrigation', 'सिंचाई', 'micro irrigation', 'drip'],
  'kcc': ['KCC', 'Kisan Credit', 'किसान क्रेडिट', 'agricultural credit'],
  'pmkusum': ['KUSUM', 'solar pump', 'सोलर पंप', 'renewable energy farmer'],
  'soil-health': ['Soil Health', 'मृदा स्वास्थ्य', 'soil testing', 'fertilizer recommendation'],
  'enam': ['e-NAM', 'eNAM', 'electronic trading', 'mandi', 'agricultural market'],
  'agri-infra': ['Agriculture Infrastructure Fund', 'AIF', 'post harvest', 'cold storage']
};

/**
 * Fetch and parse RSS feed
 */
async function fetchRSSFeed(source) {
  try {
    console.log(`📡 Fetching RSS: ${source.name}`);
    const feed = await parser.parseURL(source.url);
    return feed.items.map(item => ({
      title: item.title || '',
      link: item.link || '',
      description: item.contentSnippet || item.content || '',
      pubDate: item.pubDate ? new Date(item.pubDate) : new Date(),
      source: source.name,
      category: source.category,
      ministry: source.ministry
    }));
  } catch (error) {
    console.error(`❌ Error fetching ${source.name}:`, error.message);
    return [];
  }
}

/**
 * Match RSS item to scheme based on keywords
 */
function matchScheme(item) {
  const text = `${item.title} ${item.description}`.toLowerCase();
  
  for (const [schemeId, keywords] of Object.entries(SCHEME_KEYWORDS)) {
    for (const keyword of keywords) {
      if (text.includes(keyword.toLowerCase())) {
        return schemeId;
      }
    }
  }
  return null;
}

/**
 * Extract deadline from text (basic extraction)
 */
function extractDeadline(text) {
  // Look for common date patterns
  const patterns = [
    /last date[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
    /deadline[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
    /till\s+(\d{1,2}\s+\w+\s+\d{4})/i,
    /before\s+(\d{1,2}\s+\w+\s+\d{4})/i,
    /(\d{1,2}(?:st|nd|rd|th)?\s+\w+\s+\d{4})/i
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1];
    }
  }
  return null;
}

/**
 * Main scraper function - fetches all RSS feeds and updates database
 */
export async function runAutoScraper() {
  console.log('\n🚀 Starting Auto RSS Scraper...');
  console.log(`📅 Time: ${new Date().toLocaleString()}`);
  
  const allItems = [];
  
  // Fetch all RSS feeds
  for (const source of RSS_SOURCES) {
    const items = await fetchRSSFeed(source);
    allItems.push(...items);
  }
  
  console.log(`📰 Total items fetched: ${allItems.length}`);
  
  // Group by scheme
  const schemeUpdates = {};
  for (const item of allItems) {
    const schemeId = matchScheme(item);
    if (schemeId) {
      if (!schemeUpdates[schemeId]) {
        schemeUpdates[schemeId] = [];
      }
      schemeUpdates[schemeId].push(item);
    }
  }
  
  console.log(`🎯 Matched updates for ${Object.keys(schemeUpdates).length} schemes`);
  
  // Update database with latest news
  try {
    const Scheme = mongoose.model('Scheme');
    
    for (const [schemeId, updates] of Object.entries(schemeUpdates)) {
      const latestUpdate = updates[0]; // Most recent
      
      await Scheme.findOneAndUpdate(
        { scheme_id: schemeId },
        {
          $set: {
            last_updated_from_source: new Date()
          },
          $push: {
            sources: {
              $each: updates.slice(0, 3).map(u => ({
                title: u.title,
                url: u.link,
                date: u.pubDate,
                source_name: u.source
              })),
              $position: 0,
              $slice: 10 // Keep only last 10 sources
            }
          }
        },
        { upsert: false }
      );
      
      console.log(`✅ Updated: ${schemeId} (${updates.length} news items)`);
    }
  } catch (error) {
    console.error('❌ Database update error:', error.message);
  }
  
  console.log('✨ Auto Scraper completed!\n');
  return schemeUpdates;
}

/**
 * Scraper scheduler - runs periodically
 */
export function startScraperScheduler(intervalHours = 6) {
  // Run immediately on startup
  setTimeout(() => {
    runAutoScraper().catch(console.error);
  }, 5000); // Wait 5 seconds after server start
  
  // Then run every N hours
  const intervalMs = intervalHours * 60 * 60 * 1000;
  setInterval(() => {
    runAutoScraper().catch(console.error);
  }, intervalMs);
  
  console.log(`📅 RSS Scraper scheduled to run every ${intervalHours} hours`);
}

// For direct execution
if (process.argv[1]?.includes('auto-scraper.js')) {
  (async () => {
    const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/agri_demo';
    await mongoose.connect(MONGO_URI);
    console.log('MongoDB connected for scraping');
    await runAutoScraper();
    process.exit(0);
  })();
}
