import { TavilySearch } from "@langchain/tavily";
import { gemini, prompts, models } from '../utils/gemini';
import { SearchResult, SearchResults } from '../models/search';

// Simple search function that uses Tavily search API
export async function search(query: string): Promise<SearchResults> {
  console.log(`Searching for: ${query}`);
  
  try {
    // Using the new TavilySearch class
    const searchTool = new TavilySearch({
      //apiKey: process.env.TAVILY_API_KEY || '',
      maxResults: 5,
      includeRawContent: true,
      searchDepth: "basic"
    });
    
    // Use the search method
    const searchResponse = await searchTool.invoke({
      query: query,
    });
    
    const results: SearchResult[] = [];
    // Process search results
    for (const result of searchResponse.results || []) {
      const title = result.title || 'No Title Provided';
      const link = result.url || 'No Link Provided';
      const content = result.content || '';
            
      results.push({
        title: title,
        link: link,
        content: content,
      });
    }
    
    // Limit to 5 results
    return new SearchResults(results.slice(0, 5));
  } catch (error) {
    console.error(`Search error for query "${query}":`, error);
    return new SearchResults([]);
  }
}

// Fetch content from a URL (add check for valid URL)
/*async function fetchContent(url: string): Promise<string> {
   // Basic check if URL seems valid before attempting fetch
   if (!url || !url.startsWith('http')) {
      console.warn(`Skipping fetch for invalid URL: ${url}`);
      return '';
   }
  try {
    console.log(`Trying to fetch content from ${url}`);
    const response = await axios.get(url, {
      timeout: 20000, // 20 second timeout
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ResearchBot/1.0)' } // More descriptive User-Agent
    });
    console.log(response);
    // Very basic HTML to text conversion (consider a library like 'html-to-text' for better results)
    return response.data.toString()
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();
  } catch (error) {
    // Log specific error type if possible
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`Failed to fetch content from ${url}: ${errorMsg}`);
    return ''; // Return empty string on fetch failure
  }
}*/

// Summarize content using Gemini - using basic model as this is high-volume, simpler task
export async function summarizeContent(content: string, query: string): Promise<string> {
  console.log('Summarizing content...');
  
  try {
    const model = gemini.getGenerativeModel({ model: models.basic });
    const response = await model.generateContent({
      contents: [{ 
        role: "user", 
        parts: [{ 
          text: `${prompts.summarizePrompt}\n\n<Raw Content>${content}</Raw Content>\n\n<Research Topic>${query}</Research Topic>` 
        }] 
      }],
      generationConfig: {
        maxOutputTokens: 1024,
      }
    });
    
    return response.response.text();
  } catch (error) {
    console.error('Summarization error:', error);
    return '';
  }
}

// Process search results by summarizing their content
export async function processSearchResults(results: SearchResults, query: string): Promise<SearchResults> {
  console.log('Processing search results...');
  
  const processedResults: SearchResult[] = [];
  
  for (const result of results.results) {
    if (result.content) {
      const summary = await summarizeContent(result.content, query);
      processedResults.push({
        ...result,
        filteredContent: summary
      });
    } else {
      processedResults.push(result);
    }
  }
  
  return new SearchResults(processedResults);
}
