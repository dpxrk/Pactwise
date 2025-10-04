import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { getCorsHeaders } from '../_shared/cors.ts';
import { createAdminClient } from '../_shared/supabase.ts';

/**
 * Vendor Matcher Edge Function
 * Sophisticated vendor matching using multiple algorithms
 * Returns confidence scores and match suggestions
 */

interface VendorMatchRequest {
  vendorName: string;
  enterpriseId: string;
  vendorData?: {
    email?: string;
    phone?: string;
    address?: string;
    taxId?: string;
  };
  threshold?: number; // Minimum confidence score (0-100)
}

interface VendorMatch {
  vendorId: string;
  vendorName: string;
  confidenceScore: number;
  matchType: 'exact' | 'fuzzy' | 'phonetic' | 'partial';
  matchingAlgorithm: string;
  similarityDetails: {
    levenshtein?: number;
    trigram?: number;
    soundex?: boolean;
    emailMatch?: boolean;
    phoneMatch?: boolean;
  };
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  const supabase = createAdminClient();

  try {
    if (req.method !== 'POST') {
      throw new Error('Method not allowed');
    }

    const matchRequest: VendorMatchRequest = await req.json();
    const { vendorName, enterpriseId, vendorData, threshold = 50 } = matchRequest;

    if (!vendorName || !enterpriseId) {
      throw new Error('vendorName and enterpriseId are required');
    }

    console.log(`Matching vendor: "${vendorName}" for enterprise: ${enterpriseId}`);

    const matches: VendorMatch[] = [];

    // ================================================================
    // STEP 1: Exact Match (Case-Insensitive)
    // ================================================================
    const { data: exactMatches } = await supabase
      .from('vendors')
      .select('id, name, contact_email, contact_phone')
      .eq('enterprise_id', enterpriseId)
      .ilike('name', vendorName)
      .is('deleted_at', null);

    if (exactMatches && exactMatches.length > 0) {
      for (const match of exactMatches) {
        matches.push({
          vendorId: match.id,
          vendorName: match.name,
          confidenceScore: 100,
          matchType: 'exact',
          matchingAlgorithm: 'exact_match',
          similarityDetails: {},
        });
      }
    }

    // ================================================================
    // STEP 2: Fuzzy Match using PostgreSQL similarity (pg_trgm)
    // ================================================================
    if (matches.length === 0) {
      const { data: fuzzyMatches } = await supabase.rpc('find_duplicate_vendors', {
        p_name: vendorName,
        p_enterprise_id: enterpriseId,
      });

      if (fuzzyMatches && fuzzyMatches.length > 0) {
        for (const match of fuzzyMatches) {
          const trigramScore = match.similarity_score || 0;
          const confidenceScore = Math.round(trigramScore * 100);

          if (confidenceScore >= threshold) {
            matches.push({
              vendorId: match.id,
              vendorName: match.name,
              confidenceScore,
              matchType: 'fuzzy',
              matchingAlgorithm: 'trigram_similarity',
              similarityDetails: {
                trigram: trigramScore,
              },
            });
          }
        }
      }
    }

    // ================================================================
    // STEP 3: Levenshtein Distance (for close matches)
    // ================================================================
    if (matches.length === 0 || matches.every(m => m.confidenceScore < 90)) {
      const { data: allVendors } = await supabase
        .from('vendors')
        .select('id, name, contact_email, contact_phone')
        .eq('enterprise_id', enterpriseId)
        .is('deleted_at', null)
        .limit(100); // Limit for performance

      if (allVendors) {
        for (const vendor of allVendors) {
          const distance = levenshteinDistance(
            vendorName.toLowerCase(),
            vendor.name.toLowerCase()
          );
          const maxLength = Math.max(vendorName.length, vendor.name.length);
          const similarity = 1 - distance / maxLength;
          const confidenceScore = Math.round(similarity * 100);

          if (confidenceScore >= threshold && !matches.find(m => m.vendorId === vendor.id)) {
            matches.push({
              vendorId: vendor.id,
              vendorName: vendor.name,
              confidenceScore,
              matchType: 'fuzzy',
              matchingAlgorithm: 'levenshtein_distance',
              similarityDetails: {
                levenshtein: similarity,
              },
            });
          }
        }
      }
    }

    // ================================================================
    // STEP 4: Soundex Match (Phonetic matching)
    // ================================================================
    const vendorSoundex = soundex(vendorName);

    const { data: allVendorsForSoundex } = await supabase
      .from('vendors')
      .select('id, name')
      .eq('enterprise_id', enterpriseId)
      .is('deleted_at', null)
      .limit(100);

    if (allVendorsForSoundex) {
      for (const vendor of allVendorsForSoundex) {
        if (soundex(vendor.name) === vendorSoundex && !matches.find(m => m.vendorId === vendor.id)) {
          matches.push({
            vendorId: vendor.id,
            vendorName: vendor.name,
            confidenceScore: 75, // Fixed confidence for soundex matches
            matchType: 'phonetic',
            matchingAlgorithm: 'soundex',
            similarityDetails: {
              soundex: true,
            },
          });
        }
      }
    }

    // ================================================================
    // STEP 5: Email/Phone Match (if provided)
    // ================================================================
    if (vendorData?.email || vendorData?.phone) {
      let query = supabase
        .from('vendors')
        .select('id, name, contact_email, contact_phone')
        .eq('enterprise_id', enterpriseId)
        .is('deleted_at', null);

      if (vendorData.email) {
        query = query.or(`contact_email.ilike.%${vendorData.email}%`);
      }

      if (vendorData.phone) {
        const cleanPhone = vendorData.phone.replace(/\D/g, '');
        query = query.or(`contact_phone.ilike.%${cleanPhone}%`);
      }

      const { data: contactMatches } = await query;

      if (contactMatches && contactMatches.length > 0) {
        for (const match of contactMatches) {
          const existingMatch = matches.find(m => m.vendorId === match.id);

          const emailMatch = vendorData.email && match.contact_email?.toLowerCase().includes(vendorData.email.toLowerCase());
          const phoneMatch = vendorData.phone && match.contact_phone?.replace(/\D/g, '').includes(vendorData.phone.replace(/\D/g, ''));

          if (existingMatch) {
            // Boost existing match confidence
            existingMatch.confidenceScore = Math.min(100, existingMatch.confidenceScore + 15);
            existingMatch.similarityDetails.emailMatch = emailMatch || false;
            existingMatch.similarityDetails.phoneMatch = phoneMatch || false;
          } else {
            matches.push({
              vendorId: match.id,
              vendorName: match.name,
              confidenceScore: 85, // High confidence for contact info match
              matchType: 'partial',
              matchingAlgorithm: 'contact_info_match',
              similarityDetails: {
                emailMatch: emailMatch || false,
                phoneMatch: phoneMatch || false,
              },
            });
          }
        }
      }
    }

    // ================================================================
    // SORT AND RETURN RESULTS
    // ================================================================
    matches.sort((a, b) => b.confidenceScore - a.confidenceScore);

    // Categorize matches
    const highConfidenceMatches = matches.filter(m => m.confidenceScore >= 90);
    const mediumConfidenceMatches = matches.filter(m => m.confidenceScore >= 50 && m.confidenceScore < 90);
    const lowConfidenceMatches = matches.filter(m => m.confidenceScore < 50);

    const recommendation = {
      action: 'create_new', // Default
      message: 'No high-confidence matches found. Create new vendor.',
    };

    if (highConfidenceMatches.length > 0) {
      recommendation.action = 'auto_confirm';
      recommendation.message = `High-confidence match found: ${highConfidenceMatches[0].vendorName} (${highConfidenceMatches[0].confidenceScore}%)`;
    } else if (mediumConfidenceMatches.length > 0) {
      recommendation.action = 'review_required';
      recommendation.message = `${mediumConfidenceMatches.length} potential match(es) found. User review recommended.`;
    }

    return new Response(
      JSON.stringify({
        success: true,
        matches: matches.slice(0, 10), // Return top 10 matches
        totalMatches: matches.length,
        recommendation,
        breakdown: {
          highConfidence: highConfidenceMatches.length,
          mediumConfidence: mediumConfidenceMatches.length,
          lowConfidence: lowConfidenceMatches.length,
        },
      }),
      {
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Vendor matcher error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Matching failed',
      }),
      {
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

/**
 * Calculate Levenshtein distance between two strings
 * https://en.wikipedia.org/wiki/Levenshtein_distance
 */
function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix: number[][] = [];

  if (len1 === 0) return len2;
  if (len2 === 0) return len1;

  // Initialize matrix
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  // Fill matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // Deletion
        matrix[i][j - 1] + 1, // Insertion
        matrix[i - 1][j - 1] + cost // Substitution
      );
    }
  }

  return matrix[len1][len2];
}

/**
 * Soundex algorithm for phonetic matching
 * https://en.wikipedia.org/wiki/Soundex
 */
function soundex(str: string): string {
  const s = str.toUpperCase().replace(/[^A-Z]/g, '');
  if (s.length === 0) return '0000';

  const firstLetter = s[0];
  const codes: Record<string, string> = {
    B: '1', F: '1', P: '1', V: '1',
    C: '2', G: '2', J: '2', K: '2', Q: '2', S: '2', X: '2', Z: '2',
    D: '3', T: '3',
    L: '4',
    M: '5', N: '5',
    R: '6',
  };

  let soundexCode = firstLetter;
  let prevCode = codes[firstLetter] || '0';

  for (let i = 1; i < s.length && soundexCode.length < 4; i++) {
    const code = codes[s[i]] || '0';
    if (code !== '0' && code !== prevCode) {
      soundexCode += code;
    }
    if (code !== '0') {
      prevCode = code;
    }
  }

  return soundexCode.padEnd(4, '0').substring(0, 4);
}
