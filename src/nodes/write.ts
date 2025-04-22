import { gemini, prompts, models } from '../utils/gemini';
import { SearchResults } from '../models/search';
import { Report } from '../models/report';

export async function generateReport(
  topic: string, 
  results: SearchResults, 
  maxTokens: number = 8192
): Promise<Report> {
  console.log('Generating final research report...');
  
  // Using premium model for the most complex, reasoning-intensive task
  const model = gemini.getGenerativeModel({ 
    model: models.premiumPlus,
    generationConfig: {
      temperature: 0.6,
      maxOutputTokens: maxTokens,
    }
  });
  
  const response = await model.generateContent({
    contents: [{ 
      role: "user", 
      parts: [{ 
        text: `${prompts.reportPrompt}\n\nResearch Topic: ${topic}\n\nSearch Results:\n${results.toString()}` 
      }] 
    }],
  });
  
  const report = response.response.text();
  
  // Extract title from the report
  const titleMatch = report.match(/^#\s+(.*?)$/m);
  const title = titleMatch ? titleMatch[1] : topic;
  
  return {
    title,
    content: report
  };
}
