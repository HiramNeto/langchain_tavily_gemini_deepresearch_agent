import { GoogleGenerativeAI, GenerateContentRequest } from '@google/generative-ai';

// Initialize the Gemini API client
export const gemini = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');

// Model configuration with rate limits
export const models = {
  // Most capable, best reasoning, lowest rate limit (10 requests/min)
  premium: "gemini-2.5-flash-preview-04-17",
  
  // Intermediate capability and rate limit (15 requests/min)
  standard: "gemini-2.0-flash",
  
  // Most limited capability, highest rate limit (30 requests/min)
  basic: "gemini-2.0-flash-lite"
};

// Define prompt templates
export const prompts = {
  planningPrompt: `You are a strategic research planner with expertise in breaking down complex
                  questions into logical search steps. Generate focused, specific, and self-contained queries that
                  will yield relevant information for the research topic.`,

  summarizePrompt: `Extract and synthesize only the information relevant to the research
                   topic from this content. Preserve specific data, terminology, and
                   context while removing irrelevant information.`,

  evaluationPrompt: `Analyze these search results against the original research goal. Identify
                   specific information gaps and generate targeted follow-up queries to fill
                   those gaps. If no significant gaps exist, indicate that research is complete.`,

  filterPrompt: `Evaluate each search result for relevance, accuracy, and information value
                related to the research topic. At the end, you need to provide a list of
                source numbers with the rank of relevance. Remove the irrelevant ones.`,

  reportPrompt: `Create a comprehensive, publication-quality markdown research report based exclusively
               on the provided sources. The report should include: title, introduction, analysis (multiple sections with insights titles)
               and conclusions, references. Use proper citations (source with link; using \n\n \\[Ref. No.\\] to improve format),
               organize information logically, and synthesize insights across sources. Include all relevant details while
               maintaining readability and coherence. In each section, You MUST write in plain
               paragraghs and NEVER describe the content following bullet points or key points (1,2,3,4... or point X: ...)
               to improve the report readability.`
};

// Helper function to parse structured data from text responses
export async function parseJsonFromText<T>(text: string): Promise<T> {
  try {
    // Find JSON-like content in the response
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || 
                     text.match(/\{[\s\S]*\}/) ||
                     text.match(/\[[\s\S]*\]/);
                     
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1] || jsonMatch[0]);
    }
    
    // Fallback: try to parse the whole text as JSON
    return JSON.parse(text);
  } catch (error) {
    console.error("Failed to parse JSON from text:", error);
    throw new Error("Failed to parse structured data from AI response");
  }
}
