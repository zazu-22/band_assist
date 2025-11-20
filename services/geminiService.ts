import { GoogleGenAI, Type } from "@google/genai";
import { Instrument } from "../types";

const apiKey = process.env.API_KEY;
// Initialize efficiently only if key exists (handled in logic)
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export const getMusicAnalysis = async (prompt: string, context?: string, mediaData?: { mimeType: string, data: string }) => {
  if (!ai) {
    console.warn("Gemini API Key not found");
    return "AI features are unavailable without an API Key.";
  }

  try {
    const model = ai.models;
    
    const fullPrompt = `
      You are an expert music director and band coach specializing in Classic Rock and Blues Rock, specifically the style of ZZ Top.
      Your goal is to help a band of 4 brothers learn songs.
      
      Context provided: ${context || 'No specific song context provided.'}
      
      User Question: ${prompt}
      
      Keep answers concise, practical, and encouraging. Format with Markdown.
    `;

    const parts: any[] = [{ text: fullPrompt }];

    if (mediaData) {
      parts.push({
        inlineData: {
          mimeType: mediaData.mimeType,
          data: mediaData.data
        }
      });
    }

    const result = await model.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts },
    });
    
    return result.text;
  } catch (error) {
    console.error("Error calling Gemini:", error);
    return "Sorry, I couldn't reach the band manager (AI) right now. Please check your connection or API key.";
  }
};

export const extractPracticePlan = async (songTitle: string, difficulty: string) => {
    if (!ai) return "API Key missing.";
    
    const prompt = `Create a 3-step practice routine for the band to learn "${songTitle}" by ZZ Top. The difficulty level is ${difficulty}. Break it down by instrument groups (Rhythm section vs Melody). Return as JSON.`;
    
    try {
        const result = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt
        });
        return result.text;
    } catch (e) {
        return "Could not generate plan.";
    }
};

export const extractSongParts = async (
  instruction: string, 
  mediaData?: { mimeType: string, data: string }
): Promise<any[]> => {
  if (!ai) return [];

  try {
    const parts: any[] = [{ text: instruction }];
    if (mediaData) {
      parts.push({
        inlineData: {
          mimeType: mediaData.mimeType,
          data: mediaData.data
        }
      });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING, description: "Name of the part (e.g. Intro, Solo 1)" },
              instrument: { type: Type.STRING, description: "The instrument this part is for" },
              content: { type: Type.STRING, description: "The tablature or musical notes" },
              difficulty: { type: Type.STRING, description: "Brief difficulty rating or note" }
            },
            required: ["name", "instrument", "content"]
          }
        }
      }
    });
    
    return JSON.parse(response.text || "[]");
  } catch (error) {
    console.error("Extraction failed:", error);
    return [];
  }
}