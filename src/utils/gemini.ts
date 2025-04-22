import { GoogleGenerativeAI, GenerateContentRequest } from '@google/generative-ai';

// Initialize the Gemini API client
export const gemini = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');

// Model configuration with rate limits
export const models = {
  // More than average reasoning, lower rate limit (10 requests/min)
  premiumPlus: "gemini-2.5-flash-preview-04-17",

  // Most capable, best reasoning, lowest rate limit (10 requests/min)
  premium: "gemini-2.5-flash-preview-04-17",
  
  // Intermediate capability and rate limit (15 requests/min)
  standard: "gemini-2.0-flash",
  
  // Most limited capability, highest rate limit (30 requests/min)
  basic: "gemini-2.0-flash-lite"
};

// Define prompt templates
export const prompts = {
  planningPrompt: /*`You are a strategic research planner with expertise in breaking down complex
                  questions into logical search steps. Generate focused, specific, and self-contained queries that
                  will yield relevant information for the research topic.`,*/
                  `You are a strategic research planner specializing in comprehensive information retrieval. Your task is to:

                  1. Analyze the research topic to identify its core concepts, entities, and knowledge domains
                  2. Generate 5 highly focused search queries that:
                    - Cover different aspects of the topic
                    - Use specific terminology relevant to the domain
                    - Are formulated to retrieve factual and authoritative information
                    - Avoid overlapping information areas to prevent redundant results
                    - Ensure queries are self-contained and use natural language patterns that search engines respond well to

                  For multi-part topics, create queries that address each component. For opinion/recommendation topics, include queries for factual background, current options, and evaluation criteria.

                  Return only the most effective queries that will maximize information coverage while minimizing search iterations.`,

  summarizePrompt:/*`Extract and synthesize only the information relevant to the research
                  topic from this content. Preserve specific data, terminology, and
                  context while removing irrelevant information.`,*/
                  `Analyze the provided content and extract ONLY information directly relevant to the research topic. Your summary should:

                  1. Prioritize facts, statistics, expert opinions, and substantive analysis related to the topic
                  2. Preserve domain-specific terminology, numerical data, dates, and key entity relationships
                  3. Maintain context around extracted information to ensure accurate representation
                  4. Eliminate tangential information, generic statements, and promotional content
                  5. Structure information logically, grouping related concepts
                  6. Be concise but complete, capturing the core value of the source

                  Focus on information that adds unique value to understanding the research topic rather than duplicating information likely found in other sources.`,

                  
  
  evaluationPrompt: /*`Analyze these search results against the original research goal. Identify
                   specific information gaps and generate targeted follow-up queries to fill
                   those gaps. If no significant gaps exist, indicate that research is complete.`,*/ 
                   `As a pragmatic research analyst, evaluate if the collected information is SUFFICIENT to answer the original research question.

                   Consider the following:
                   1. Does the information cover the main aspects needed to adequately address the topic?
                   2. Focus on SUFFICIENCY rather than COMPLETENESS - research rarely captures every possible detail.
                   3. Apply the principle of diminishing returns - if new searches are likely to yield minimal new insights, consider the research complete.
                   4. If you recommend new queries, ensure they would provide SUBSTANTIALLY NEW information rather than slight variations of what we already know.
                   
                   Evaluation criteria for different research types:
                    - For factual questions: Are key facts with supporting evidence present?
                    - For processes/guides: Are all crucial steps covered with necessary details?
                    - For comparative topics: Is information about all relevant options included?
                    - For complex topics: Are multiple perspectives represented with appropriate nuance?

                   For evaluation:
                    - If the information is sufficient, explicitly state that the research is complete.
                    - If essential information is missing, identify SPECIFIC information gaps and provide targeted follow-up queries (maximum of 5) to fill ONLY those critical gaps.
                   
                   Research should be considered complete when it provides adequate information to address the core question, even if peripheral details could be expanded.
                   Remember: It's better to proceed with sufficient information than to get stuck in endless research loops seeking theoretical completeness.`,


  filterPrompt: /*`Evaluate each search result for relevance, accuracy, and information value
                related to the research topic. At the end, you need to provide a list of
                source numbers with the rank of relevance. Remove the irrelevant ones.`,*/
                `Critically evaluate each search result against the research topic, assessing:

                1. RELEVANCE: How directly does the content address the specific research question?
                2. INFORMATION VALUE: Does it provide unique, substantive information not found in other results?
                3. RELIABILITY: Does the source appear authoritative and fact-based?
                4. CURRENTNESS: Is the information up-to-date for this topic?
                5. DEPTH: Does it provide meaningful detail rather than surface-level information?

                Then:
                1. Assign a relevance rank to each result (higher rank = more valuable)
                2. REMOVE completely irrelevant or redundant sources
                3. Return ONLY a JSON object with the format {"rankedSources": [n1, n2, n3...]} where numbers represent the original search result positions in order of relevance
                4. Include only the most informative sources that contribute unique value

                Do not explain your reasoning - return only the JSON object.`,

  reportPrompt: /*`Create a comprehensive, publication-quality markdown research report based exclusively
               on the provided sources. The report should include: title, introduction, analysis (multiple sections with insights titles)
               and conclusions, references. Use proper citations (source with link; using \n\n \\[Ref. No.\\] to improve format),
               organize information logically, and synthesize insights across sources. Include all relevant details while
               maintaining readability and coherence. In each section, You MUST write in plain
               paragraghs and NEVER describe the content following bullet points or key points (1,2,3,4... or point X: ...)
               to improve the report readability.`*/
               `Create a comprehensive, publication-quality markdown research report based exclusively on the provided sources. Structure as follows:

                # [Concise, Descriptive Title]

                ## Introduction
                Provide context, importance, and scope of the topic. Outline the key questions addressed in this report.

                ## [Custom Section Heading for Main Finding/Theme 1]
                Present major insights on this aspect, synthesizing information across sources. Incorporate relevant facts, figures, and expert perspectives. Analyze implications.

                ## [Custom Section Heading for Main Finding/Theme 2]
                [Similar approach for next major theme]

                [Additional sections as needed, each with unique insights rather than source summaries]

                ## Conclusion
                Synthesize the key findings, address the original research question, and highlight practical implications or applications.

                ## References
                List all sources used, with full citations including links.

                Formatting requirements:
                - Write in cohesive, flowing paragraphs with logical transitions
                - Use proper citations within text (e.g., [Ref. 1])
                - Include specific data points, statistics, and expert opinions with attribution
                - Present a balanced, objective analysis that accurately represents the sources
                - NO bullet points, numbered lists, or "key points" formatting
                - Organize information thematically rather than source-by-source
                - Use markdown headers and formatting consistently

                Focus on synthesizing a coherent narrative that provides genuine insight rather than merely summarizing sources.`,
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
