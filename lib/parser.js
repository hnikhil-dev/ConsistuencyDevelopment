// lib/parser.js

// Multilingual keyword mapping for category extraction (English, Hindi, Marathi)
const KEYWORD_MAPS = {
  education: [/school/i, /classroom/i, /teacher/i, /student/i, /education/i, /shala/i, /shalet/i, /varga/i, /shikshan/i, /abhyasika/i, /colg/i, /college/i],
  roads: [/road/i, /pothole/i, /pavement/i, /bridge/i, /highway/i, /street/i, /rasta/i, /sadak/i, /khadda/i, /signal/i, /dusta/i],
  water: [/water/i, /leak/i, /drain/i, /sewage/i, /pipeline/i, /tap/i, /pani/i, /paani/i, /nal/i, /bamba/i, /tanker/i],
  health: [/hospital/i, /clinic/i, /doctor/i, /dispensary/i, /dawakhana/i, /rogya/i, /aarogya/i, /nurse/i, /beds/i],
  sanitation: [/garbage/i, /trash/i, /cleaning/i, /toilet/i, /kachra/i, /ghaan[ ]*/i, /sandaas/i, /washroom/i, /drainage/i, /mutari/i],
  skill: [/skill/i, /vocational/i, /training/i, /center/i, /employment/i, /job/i, /naukri/i, /udyog/i, /livelihood/i]
};

// Local translation dictionary for mock translation (Marathi/Hindi to English)
const TRANSLATION_DICT = [
  { keywords: [/shala/i, /shalet/i], translation: "school" },
  { keywords: [/varga/i, /kholya/i], translation: "classrooms" },
  { keywords: [/gardy/i, /gardi/i], translation: "crowded / capacity gap" },
  { keywords: [/rasta/i, /sadak/i], translation: "road" },
  { keywords: [/khadda/i, /khadde/i, /pothole/i], translation: "potholes" },
  { keywords: [/pani/i, /paani/i], translation: "water" },
  { keywords: [/nal/i, /pipe/i], translation: "pipe / tap" },
  { keywords: [/kachra/i, /ghaan/i], translation: "garbage / trash" },
  { keywords: [/dawakhana/i, /hospital/i], translation: "hospital / clinic" },
  { keywords: [/kam/i, /job/i, /nokri/i], translation: "employment / skill center" }
];

// Ward locality mapping
const LOCALITY_MAPS = [
  { wardId: 1, keywords: [/koregaon/i, /kp/i, /extension/i] },
  { wardId: 2, keywords: [/hadapsar/i, /industrial/i, /phursungi/i] },
  { wardId: 3, keywords: [/wanowrie/i, /wanodi/i, /central/i] },
  { wardId: 4, keywords: [/kondhwa/i, /khurd/i, /mithanagar/i] },
  { wardId: 5, keywords: [/mundhwa/i, /junction/i, /keshavnagar/i] }
];

/**
 * Calculates a multi-factor trust score between 0-10 based on evidence richness.
 */
export function calculateTrustScore(submission) {
  let score = 2.0; // Base score for raw text submission
  
  if (submission.audio_url) score += 1.5; // Audio verification (+1.5)
  if (submission.image_url) score += 2.5; // Photo verification (+2.5)
  if (submission.gps_lat && submission.gps_lng) score += 2.5; // GPS verification (+2.5)
  if (submission.user_name && submission.user_name.trim().length > 2) score += 1.5; // Metadata completeness (+1.5)
  
  return Math.min(score, 10.0);
}

/**
 * Fallback Rule-Based Parser (Runs locally when Gemini API key is missing)
 */
function runLocalRuleParser(text, trustScore) {
  let cleanText = text || '';
  
  // 1. Language detection (naive check for Hindi/Marathi keywords)
  const isMultilingual = /[मबजशरतपनक]/i.test(cleanText) || 
                         TRANSLATION_DICT.some(d => d.keywords.some(k => k.test(cleanText)));
  
  const originalLanguage = isMultilingual ? "Marathi/Hindi" : "English";

  // 2. Perform translation mapping
  let translatedText = cleanText;
  if (isMultilingual) {
    let matches = [];
    TRANSLATION_DICT.forEach(item => {
      item.keywords.forEach(kw => {
        if (kw.test(cleanText)) {
          matches.push(item.translation);
        }
      });
    });
    if (matches.length > 0) {
      translatedText = `Translated suggestion: Citizen reported issues with: ${matches.join(", ")}. Raw text: "${cleanText}"`;
    }
  }

  // 3. Category classification via keyword mapping
  let category = "roads"; // default category fallback
  let maxMatches = 0;
  let keywordMatchesCount = 0;

  Object.entries(KEYWORD_MAPS).forEach(([cat, regexes]) => {
    let matches = 0;
    regexes.forEach(regex => {
      if (regex.test(cleanText)) {
        matches++;
        keywordMatchesCount++;
      }
    });
    if (matches > maxMatches) {
      maxMatches = matches;
      category = cat;
    }
  });

  // 4. Locality / Ward Extraction
  let wardId = null;
  LOCALITY_MAPS.forEach(loc => {
    loc.keywords.forEach(kw => {
      if (kw.test(cleanText)) {
        wardId = loc.wardId;
      }
    });
  });

  // If text mentions "Ward X" or "Ward 3" etc, parse it directly
  const wardRegex = /ward[ ]*([1-5])/i;
  const wardMatch = cleanText.match(wardRegex);
  if (wardMatch) {
    wardId = parseInt(wardMatch[1], 10);
  }

  // 5. Dynamic rule confidence score
  // Confidence scales with keyword matches: base 0.25 + 0.20 per match. Capped at 0.85.
  let confidenceScore = 0.25 + (0.20 * Math.max(maxMatches, wardId ? 1 : 0));
  confidenceScore = Math.min(confidenceScore, 0.85);

  return {
    category,
    issue_details: translatedText,
    ward_id: wardId,
    confidence_score: confidenceScore,
    status: confidenceScore >= 0.70 ? 'verified' : 'pending_review',
    trust_score: trustScore,
    original_language: originalLanguage
  };
}

/**
 * Live Gemini Ingestion Parser (Sends text, images, or audio prompts to Gemini API)
 */
async function runGeminiParser(text, trustScore, apiKey) {
  const modelUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  
  const systemPrompt = `You are the core parser for the "People's Priorities" constituency planning dashboard.
Convert the raw citizen submission into a structured JSON object.
Return ONLY valid JSON matching this schema:
{
  "category": "education" | "roads" | "water" | "health" | "sanitation" | "skill",
  "issue_details": "English translated clear and concise details of the issue",
  "ward_id": 1 | 2 | 3 | 4 | 5 | null,
  "confidence_score": 0.0 to 1.0 (how sure you are of the category/location),
  "original_language": "Marathi" | "Hindi" | "English" | "Other"
}

Constituency local Wards and landmarks:
- Ward 1: Koregaon Park Extension, KP
- Ward 2: Hadapsar, Industrial area, Phursungi
- Ward 3: Wanowrie, Central Wanowrie
- Ward 4: Kondhwa Khurd, Mithanagar
- Ward 5: Mundhwa, Mundhwa Junction, Keshavnagar`;

  try {
    const response = await fetch(modelUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: `${systemPrompt}\n\nRaw Citizen input: "${text}"` }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: "application/json"
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.statusText}`);
    }

    const data = await response.json();
    const responseText = data.candidates[0].content.parts[0].text;
    const parsed = JSON.parse(responseText);

    return {
      category: parsed.category || 'roads',
      issue_details: parsed.issue_details || text,
      ward_id: parsed.ward_id || null,
      confidence_score: parsed.confidence_score || 0.5,
      status: (parsed.confidence_score || 0.5) >= 0.70 ? 'verified' : 'pending_review',
      trust_score: trustScore,
      original_language: parsed.original_language || 'English'
    };
  } catch (error) {
    console.error("Gemini Ingest Parser failed, falling back to rule engine:", error);
    return runLocalRuleParser(text, trustScore);
  }
}

/**
 * Primary Parser Interface
 * Parses citizen raw submissions, routes through Gemini (if API key exists) or Local Rules.
 */
export async function parseSubmission(submission) {
  const trustScore = calculateTrustScore(submission);
  const apiKey = process.env.GEMINI_API_KEY;
  const text = submission.raw_text || '';

  if (apiKey && apiKey.trim().length > 10) {
    return await runGeminiParser(text, trustScore, apiKey);
  } else {
    return runLocalRuleParser(text, trustScore);
  }
}
