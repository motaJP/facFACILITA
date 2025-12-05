import { GoogleGenAI } from "@google/genai";

// Helper to safely get the API key
const getApiKey = (): string | undefined => {
  // Safe check for process.env in case polyfill fails or build replacement misses
  try {
    return process.env.API_KEY;
  } catch (e) {
    return undefined;
  }
};

export const analyzeDiscrepancy = async (
  internalRecord: string,
  externalCandidates: string[]
): Promise<string> => {
  const apiKey = getApiKey();
  if (!apiKey) return "API Key missing. Cannot perform AI analysis.";

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
    You are a financial reconciliation assistant. 
    Analyze why this internal record did not match perfectly with the provided external candidates.
    
    Internal Record (JSON): ${internalRecord}
    
    External Candidates (JSON array): ${JSON.stringify(externalCandidates)}
    
    Check for:
    1. Date format mismatches (e.g. DD/MM/YYYY vs MM/DD/YYYY).
    2. CTE Number typos (e.g. missing zeros, extra spaces).
    3. Value discrepancies (small rounding errors vs large differences).
    
    Provide a concise 1-sentence explanation of the most likely match or why no match exists.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "Could not analyze discrepancy.";
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return "Error connecting to AI service.";
  }
};

export const parseMessyDate = async (dateStr: string): Promise<string | null> => {
   const apiKey = getApiKey();
   if (!apiKey) return null;

   const ai = new GoogleGenAI({ apiKey });
   
   // Keep it cheap and fast
   const prompt = `Convert this date string "${dateStr}" to ISO format YYYY-MM-DD. Return ONLY the string. If invalid, return "INVALID".`;

   try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    const text = response.text?.trim();
    return text === 'INVALID' ? null : text || null;
   } catch (e) {
     return null;
   }
};