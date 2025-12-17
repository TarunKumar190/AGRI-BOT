/**
 * Offline Search Utility for KrishiMitra
 * Provides retrieval-based QA from pre-loaded JSON data
 * NO external API calls - works completely offline
 */

import offlineData from '../data/finaldata_dipsiv.json';

// Cache the normalized data on first load
let normalizedCache = null;

/**
 * Normalize text for matching: lowercase, remove punctuation, trim whitespace
 */
const normalizeText = (text) => {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[^\w\s\u0900-\u097F]/g, ' ')  // Keep Hindi characters (Devanagari range)
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Tokenize text into words for matching
 */
const tokenize = (text) => {
  return normalizeText(text).split(' ').filter(word => word.length > 1);
};

/**
 * Calculate word overlap score between query and question
 * Returns a score from 0 to 1
 */
const calculateWordOverlap = (queryTokens, questionTokens) => {
  if (queryTokens.length === 0 || questionTokens.length === 0) return 0;
  
  const querySet = new Set(queryTokens);
  const questionSet = new Set(questionTokens);
  
  let matchCount = 0;
  for (const word of querySet) {
    if (questionSet.has(word)) {
      matchCount++;
    }
  }
  
  // Jaccard-like similarity
  const unionSize = new Set([...queryTokens, ...questionTokens]).size;
  return matchCount / unionSize;
};

/**
 * Calculate phrase match score - bonus for consecutive word matches
 */
const calculatePhraseMatch = (normalizedQuery, normalizedQuestion) => {
  if (normalizedQuestion.includes(normalizedQuery)) {
    return 1.0; // Exact phrase match
  }
  
  // Check for partial phrase matches (3+ consecutive words)
  const queryWords = normalizedQuery.split(' ');
  let maxConsecutive = 0;
  
  for (let len = Math.min(queryWords.length, 5); len >= 3; len--) {
    for (let i = 0; i <= queryWords.length - len; i++) {
      const phrase = queryWords.slice(i, i + len).join(' ');
      if (normalizedQuestion.includes(phrase)) {
        maxConsecutive = Math.max(maxConsecutive, len);
      }
    }
  }
  
  return maxConsecutive >= 3 ? (maxConsecutive / queryWords.length) * 0.8 : 0;
};

/**
 * Simple fuzzy matching using Levenshtein distance for short strings
 */
const levenshteinDistance = (str1, str2) => {
  const m = str1.length;
  const n = str2.length;
  
  if (m === 0) return n;
  if (n === 0) return m;
  
  // Use two rows instead of full matrix for memory efficiency
  let prevRow = Array(n + 1).fill(0).map((_, i) => i);
  let currRow = Array(n + 1).fill(0);
  
  for (let i = 1; i <= m; i++) {
    currRow[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      currRow[j] = Math.min(
        prevRow[j] + 1,      // deletion
        currRow[j - 1] + 1,  // insertion
        prevRow[j - 1] + cost // substitution
      );
    }
    [prevRow, currRow] = [currRow, prevRow];
  }
  
  return prevRow[n];
};

/**
 * Calculate fuzzy similarity for individual important words
 */
const calculateFuzzyWordMatch = (queryTokens, questionTokens) => {
  if (queryTokens.length === 0) return 0;
  
  let totalScore = 0;
  
  for (const queryWord of queryTokens) {
    if (queryWord.length < 3) continue; // Skip very short words
    
    let bestWordScore = 0;
    for (const questionWord of questionTokens) {
      if (questionWord.length < 3) continue;
      
      // Exact match
      if (queryWord === questionWord) {
        bestWordScore = 1;
        break;
      }
      
      // Starts with match (prefix)
      if (questionWord.startsWith(queryWord) || queryWord.startsWith(questionWord)) {
        bestWordScore = Math.max(bestWordScore, 0.8);
        continue;
      }
      
      // Fuzzy match using Levenshtein
      const maxLen = Math.max(queryWord.length, questionWord.length);
      const distance = levenshteinDistance(queryWord, questionWord);
      const similarity = 1 - (distance / maxLen);
      
      if (similarity > 0.7) { // Only count if fairly similar
        bestWordScore = Math.max(bestWordScore, similarity * 0.7);
      }
    }
    
    totalScore += bestWordScore;
  }
  
  return totalScore / queryTokens.length;
};

/**
 * Get normalized and cached data
 */
const getNormalizedData = () => {
  if (normalizedCache) return normalizedCache;
  
  normalizedCache = offlineData.map((item, index) => ({
    ...item,
    index,
    normalizedQuestion: normalizeText(item.question),
    questionTokens: tokenize(item.question)
  }));
  
  return normalizedCache;
};

/**
 * Main offline search function
 * @param {string} query - User's question
 * @param {number} threshold - Minimum score to consider a match (0-1)
 * @returns {Object} Best matching answer or fallback message
 */
export const offlineSearch = (query, threshold = 0.25) => {
  if (!query || typeof query !== 'string') {
    return {
      found: false,
      answer: "Sorry, I don't have this information available offline.",
      answerHi: "क्षमा करें, यह जानकारी ऑफलाइन उपलब्ध नहीं है।",
      confidence: 0
    };
  }

  const data = getNormalizedData();
  const normalizedQuery = normalizeText(query);
  const queryTokens = tokenize(query);
  
  if (queryTokens.length === 0) {
    return {
      found: false,
      answer: "Sorry, I couldn't understand your question. Please try again.",
      answerHi: "क्षमा करें, मैं आपका प्रश्न नहीं समझ सका। कृपया दोबारा प्रयास करें।",
      confidence: 0
    };
  }

  // Calculate scores for all questions
  const scoredResults = data.map(item => {
    // Word overlap score (weight: 40%)
    const wordOverlapScore = calculateWordOverlap(queryTokens, item.questionTokens);
    
    // Phrase match score (weight: 35%)
    const phraseScore = calculatePhraseMatch(normalizedQuery, item.normalizedQuestion);
    
    // Fuzzy word match score (weight: 25%)
    const fuzzyScore = calculateFuzzyWordMatch(queryTokens, item.questionTokens);
    
    // Combined weighted score
    const totalScore = (wordOverlapScore * 0.4) + (phraseScore * 0.35) + (fuzzyScore * 0.25);
    
    return {
      ...item,
      score: totalScore,
      wordOverlapScore,
      phraseScore,
      fuzzyScore
    };
  });

  // Sort by score descending
  scoredResults.sort((a, b) => b.score - a.score);
  
  // Get the best match
  const bestMatch = scoredResults[0];
  
  // Debug logging (can be removed in production)
  if (process.env.NODE_ENV === 'development') {
    console.log('[OfflineSearch] Query:', query);
    console.log('[OfflineSearch] Top 3 matches:');
    scoredResults.slice(0, 3).forEach((r, i) => {
      console.log(`  ${i + 1}. Score: ${r.score.toFixed(3)} | Q: ${r.question.substring(0, 60)}...`);
    });
  }

  // Check if best match meets threshold
  if (bestMatch && bestMatch.score >= threshold) {
    return {
      found: true,
      answer: bestMatch.answer,
      question: bestMatch.question,
      source: bestMatch.source,
      confidence: bestMatch.score
    };
  }

  // No good match found
  return {
    found: false,
    answer: "Sorry, I don't have this information available offline. Please try online mode for more comprehensive answers.",
    answerHi: "क्षमा करें, यह जानकारी ऑफलाइन उपलब्ध नहीं है। अधिक विस्तृत उत्तर के लिए कृपया ऑनलाइन मोड आज़माएं।",
    confidence: bestMatch ? bestMatch.score : 0
  };
};

/**
 * Get total count of offline QA pairs (for UI display)
 */
export const getOfflineDataCount = () => {
  return offlineData.length;
};

/**
 * Check if offline data is loaded
 */
export const isOfflineDataReady = () => {
  return offlineData && offlineData.length > 0;
};

export default offlineSearch;
