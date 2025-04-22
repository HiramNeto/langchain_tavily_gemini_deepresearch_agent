import { gemini, prompts, parseJsonFromText, models } from '../utils/gemini';
import { ResearchPlan } from '../models/plan';

export async function generateResearchPlan(topic: string, maxQueries: number = 5): Promise<string[]> {
  console.log(`Generating research plan for topic: ${topic}`);
  
  // Generate plan with Gemini - using premium plus model for complex reasoning task
  const planModel = gemini.getGenerativeModel({ model: models.premiumPlus });
  const planResponse = await planModel.generateContent({
    contents: [{ role: "user", parts: [{ text: `${prompts.planningPrompt}\n\nResearch Topic: ${topic}` }] }],
  });
  
  const plan = planResponse.response.text();
  console.log(`Generated plan: ${plan}`);
  
  // Use standard model to extract structured queries from the plan
  const parseModel = gemini.getGenerativeModel({ model: models.standard });
  // Extract structured queries from the plan - with more specific instructions
  const parseResponse = await parseModel.generateContent({
    contents: [{ 
      role: "user", 
      parts: [{ text: `Extract the search queries from this research plan as a JSON array with the following format: {"queries": ["query1", "query2", ...]}:\n\n${plan}` }] 
    }],
  });
  
  const parsedText = parseResponse.response.text();
  // Add logging to see the raw response for query extraction
  console.log(`Raw response for query extraction: ${parsedText}`);
  
  try {
    const jsonData = await parseJsonFromText<ResearchPlan>(parsedText);
    // Check if we have the expected structure
    if (jsonData && jsonData.queries && Array.isArray(jsonData.queries)) {
      // Limit queries if needed
      const queries = maxQueries > 0 ? jsonData.queries.slice(0, maxQueries) : jsonData.queries;
      console.log(`Successfully parsed ${queries.length} queries from JSON.`);
      return queries;
    } else {
      console.warn("Parsed JSON data does not have the expected structure. Falling back to manual extraction from the original plan.");
      // Fallback: Try extracting manually from the original plan text if JSON structure is wrong
      const extractedQueries = extractQueriesFromPlanText(plan, maxQueries);
      console.log(`Extracted ${extractedQueries.length} queries manually from plan text (fallback 1).`);
      // Ensure we return at least one query if extraction fails
      return extractedQueries.length > 0 ? extractedQueries : [`${topic} impact and applications`];
    }
  } catch (error) {
    console.error("Failed to parse JSON response for queries:", error);
    // Fallback: Extract manually from the original plan text
    const extractedQueries = extractQueriesFromPlanText(plan, maxQueries);
    console.log(`Extracted ${extractedQueries.length} queries manually from plan text (fallback 2).`);
    // Ensure we return at least one query if extraction fails
    return extractedQueries.length > 0 ? extractedQueries : [`${topic} impact and applications`];
  }
}

// Helper function to extract queries from the plan text
function extractQueriesFromPlanText(plan: string, maxQueries: number): string[] {
    // Try extracting quoted strings first, as they are likely queries
    let queries = plan.match(/"([^"]+)"/g)?.map(q => q.replace(/"/g, '')) || [];

    // If no quoted strings found, try extracting numbered list items or lines with specific keywords
    if (queries.length === 0) {
        const lines = plan.split('\n').filter(line =>
            line.match(/^\s*\*\s+/) || // Lines starting with *
            line.match(/^\s*\d+\.\s+/) || // Lines starting with number.
            line.includes('AI in') ||
            line.includes('impact of')
        );
        queries = lines.map(l =>
            // Try to clean up the line to get the core query
            l.replace(/^\s*[\*\d\.]+\s*/, '') // Remove list markers
             .replace(/:\s*$/, '') // Remove trailing colons
             .trim()
        );
    }

    // Filter out any potentially empty strings and limit
    queries = queries.filter(q => q.length > 0);
    return maxQueries > 0 ? queries.slice(0, maxQueries) : queries;
}
