import { gemini, prompts, parseJsonFromText, models } from '../utils/gemini';
import { SearchResults } from '../models/search';
import { ResearchEvaluation } from '../models/plan';

export async function evaluateCompleteness(
  topic: string,
  results: SearchResults
): Promise<ResearchEvaluation> {
  console.log('Evaluating research completeness...');
  if (results.results.length === 0) {
    console.warn("Evaluating completeness with zero results. Assuming research is not complete.");
    // Return a default 'not complete' state if there are no results to evaluate
    return { isComplete: false, queries: [`${topic} overview`, `${topic} key aspects`] };
  }

  const evaluationModel = gemini.getGenerativeModel({ 
    model: models.premium,
    generationConfig: {
      temperature: 0.2, // Lower temperature for consistent evaluation
    }
  });
  const standardModel = gemini.getGenerativeModel({ model: models.standard });

  try {
    const response = await evaluationModel.generateContent({
      contents: [{ role: "user", parts: [{ text: `${prompts.evaluationPrompt}\n\n<Research Topic>${topic}</Research Topic>\n\n<Search Results>${results.toString()}</Search Results>` }] }],
    });

    const evaluation = response.response.text();
    console.log('Raw Evaluation result text:', evaluation); // Log raw evaluation
    // Parse follow-up queries from the evaluation
    const parseResponse = await standardModel.generateContent({
      contents: [{
        role: "user",
        parts: [{
          text: `Extract the following from the evaluation as JSON:\n
          1. isComplete: boolean indicating if the research is complete
          2. queries: array of follow-up search queries (empty if complete)

          Evaluation: ${evaluation}\n\nReturn ONLY the JSON object.` // Added instruction for JSON only
        }]
      }],
    });

    const parsedText = parseResponse.response.text();
    console.log('Raw JSON extraction text:', parsedText); // Log raw text before parsing
    // **Add try-catch around JSON parsing**
    try {
      const parsedEvaluation = await parseJsonFromText<ResearchEvaluation>(parsedText);
      // **Add validation check**
      if (typeof parsedEvaluation.isComplete !== 'boolean' || !Array.isArray(parsedEvaluation.queries)) {
        console.warn("Parsed evaluation JSON has incorrect structure. Defaulting to not complete.", parsedEvaluation);
         // Provide default queries if structure is wrong but parsing succeeded
         const defaultQueries = [`${topic} further details`, `${topic} recent developments`];
         return { isComplete: false, queries: parsedEvaluation.queries?.length > 0 ? parsedEvaluation.queries : defaultQueries };
      }
      console.log('Successfully parsed evaluation:', parsedEvaluation);
      return parsedEvaluation;
    } catch (parseError) {
      console.error("Failed to parse JSON from evaluation response:", parseError);
      console.warn("Defaulting to research not complete due to parsing error.");
        
      // Fallback if JSON parsing fails completely
      return { isComplete: false, queries: [`${topic} summary`, `${topic} related topics`] };
    }

  } catch (error) {
    console.error("Error during completeness evaluation API call:", error);
    console.warn("Defaulting to research not complete due to API error.");
    // Fallback if the initial evaluation API call fails
    return { isComplete: false, queries: [`${topic} overview`, `${topic} challenges`] };
  }
}

// Define an interface for the expected JSON structure from the filter prompt
interface FilterResponse {
  rankedSources?: number[]; // Make it optional to handle cases where it might be missing
}

export async function filterSearchResults(
  topic: string,
  results: SearchResults
): Promise<SearchResults> {
  console.log('Filtering search results...');
  if (results.results.length === 0) {
    console.log("No results to filter.");
    return results; // Return empty results if nothing to filter
  }

  const model = gemini.getGenerativeModel({ 
    model: models.standard,
    generationConfig: {
      temperature: 0.1, // Lower temperature for consistent filtering
    }
  });

  try {
    const response = await model.generateContent({
      contents: [{
        role: "user",
        parts: [{
          text: `${prompts.filterPrompt}\n\n<Research Topic>${topic}</Research Topic>\n\n<Search Results>\n${results.shortString()}\n</Search Results>\n\nReturn ONLY the JSON object with the key "rankedSources" containing an array of the relevant source numbers (e.g., {"rankedSources": [1, 3, 5]}).`
        }]
      }],
      // Optional: Add safety settings if needed
      // safetySettings: [...]
    });

    const filterText = response.response.text();
    console.log('Filter result text:', filterText); // Log the raw text for debugging

    // Attempt to parse the JSON
    const parsedJson = await parseJsonFromText<FilterResponse>(filterText);

    // **Robust Check:** Ensure parsedJson and rankedSources exist and are an array
    if (parsedJson && Array.isArray(parsedJson.rankedSources) && parsedJson.rankedSources.length > 0) {
      const rankedIndices = parsedJson.rankedSources
        // Filter out invalid numbers (non-numbers, out of bounds)
        .filter(num => typeof num === 'number' && num > 0 && num <= results.results.length)
        // Convert 1-based index from LLM to 0-based array index
        .map(num => num - 1);

      // Create a new array with results in the ranked order
      const filtered = rankedIndices.map(index => results.results[index]);

      // Limit to a reasonable number (e.g., top 10) after filtering
      const finalFiltered = filtered.slice(0, 10);
      console.log(`Filtered down to ${finalFiltered.length} results based on relevance ranking.`);
      return new SearchResults(finalFiltered);

    } else {
      console.warn("Failed to parse valid rankedSources array from filter response. Returning original top 5 results as fallback.");
      // Fallback: Return the original top 5 results if filtering fails
      return new SearchResults(results.results.slice(0, 5));
    }

  } catch (error) {
    console.error("Error during filtering:", error);
    console.warn("Filter node failed. Returning original top 5 results as fallback.");
    // Fallback: Return the original top 5 results if any error occurs
    return new SearchResults(results.results.slice(0, 5));
  }
}
