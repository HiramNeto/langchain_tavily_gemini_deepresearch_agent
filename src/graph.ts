import { StateGraph, Annotation, END } from "@langchain/langgraph";
import { RunnableConfig, RunnableSequence } from "@langchain/core/runnables";
import * as planNode from "./nodes/plan";
import * as runSearch from "./nodes/search";
import * as evaluateNode from "./nodes/evaluate";
import * as writeNode from "./nodes/write";
import { SearchResults, SearchResult } from "./models/search";

// Define the state type with more specific types
interface ResearchState {
  topic?: string;
  queries?: string[];
  results?: Array<{
    query: string;
    searchResults: SearchResults;
  }>;
  isComplete?: boolean;
  filteredResults?: Array<{
    query: string;
    searchResults: SearchResult[];
  }>;
  report?: {
    title: string;
    content: string;
  };
}

// Create state definition using Annotation
let stateDefinition = Annotation.Root({
  topic: Annotation<string>(),
  queries: Annotation<string[]>(),
  results: Annotation<Array<{
    query: string;
    searchResults: SearchResults;
  }>>(),
  isComplete: Annotation<boolean>(),
  filteredResults: Annotation<Array<{
    query: string;
    searchResults: SearchResult[];
  }>>(),
  report: Annotation<{
    title: string;
    content: string;
  }>()
});

// Define input type for the node functions
interface NodeInput {
  state: ResearchState;
  config?: RunnableConfig;
}

const planingNode = async (state: typeof stateDefinition.State) => {
  // Extract topic directly
  const topic = state.topic;
  if (!topic) throw new Error("No topic provided for planning");
  
  // Execute plan
  const queries = await planNode.generateResearchPlan(topic);
          
  return {
    topic, // Keep the original topic
    queries // Add the generated queries
  };
};

const searchingNode = async (state: typeof stateDefinition.State) => {
   
  // Extract queries directly from input
  const queries = state.queries;
  
  if (!queries || queries.length === 0) throw new Error("No queries provided for search");
  
  // Process all queries and collect results
  const results = await Promise.all(
    queries.map(async (query) => ({
      query,
      searchResults: await runSearch.search(query)
    }))
  );
  
  // Return ONLY the updated field: results
  return { results };

};

const evaluatingNode = async (state: typeof stateDefinition.State) => {
  // Extract topic and results directly from input
  const topic = state.topic;
  const results = state.results;

  if (!topic) throw new Error("No topic provided for evaluation");
  if (!results || results.length === 0) throw new Error("No results to evaluate");

  // Flatten all search results for evaluation
  const flattenedResults = new SearchResults(
    results.flatMap(r => r.searchResults.results)
  );

  // Evaluate completeness of research
  const evaluation = await evaluateNode.evaluateCompleteness(topic, flattenedResults);

  // Filter results to keep only the most relevant ones
  const filteredRawResults = await evaluateNode.filterSearchResults(topic, flattenedResults);

  // Ensure we have at least one result in filteredResults, even if it's empty
  // This prevents the branch condition from failing
  return {
    isComplete: evaluation.isComplete === true, // Ensure it's a boolean true/false
    // If not complete, add new queries to the state
    ...(evaluation.isComplete ? {} : { queries: evaluation.queries }),
    filteredResults: [{
      query: topic,
      searchResults: filteredRawResults.results.length > 0 
        ? filteredRawResults.results 
        : [{ // Add a placeholder result if no results were found
            title: "No relevant results found",
            link: "",
            content: "Please try different search queries."
          }]
    }]
  };
};

const writingNode = async (state: typeof stateDefinition.State) => {
  // Extract directly from input
  const topic = state.topic;
  const filteredResults = state.filteredResults;
  
  if (!topic) throw new Error("No topic provided for report writing");
  if (!filteredResults || filteredResults.length === 0) 
    throw new Error("No filtered results for report writing");
  
  // Flatten all search results for report generation
  const flattenedResults = new SearchResults(
    filteredResults.flatMap(r => r.searchResults)
  );
  
  // Generate final research report
  const report = await writeNode.generateReport(topic, flattenedResults);
  
  return { report };
};

// Define the research workflow graph
// This graph orchestrates the entire research process from planning to report generation

// StateGraph: Manages the flow of data between nodes in our research workflow
// Each node represents a specific step in the research process
// Edges define the possible transitions between steps

// Graph structure:
// 1. Plan -> Search -> Evaluate -> [conditional branch]
//    a. If research is complete -> Write -> END
//    b. If research is incomplete -> Search (loop back for more data)

// Node descriptions:
// - Plan: Generates initial research queries based on the topic
// - Search: Executes search queries and collects results
// - Evaluate: Assesses if we have sufficient information and filters results
// - Write: Generates the final research report
const graph = new StateGraph(stateDefinition)
  .addNode("Plan", planingNode)
  .addNode("Search", searchingNode)
  .addNode("Evaluate", evaluatingNode)
  .addNode("Write", writingNode)
  .setEntryPoint("Plan")
  .addEdge("Plan", "Search")
  .addConditionalEdges(
    "Evaluate",
    (state) => {
      // Verificação simplificada do estado
      if (state && typeof state === 'object' && 'isComplete' in state) {
        const isComplete = !!state.isComplete;
        console.log(`Evaluation complete: ${isComplete ? 'Yes' : 'No'}`);
        // Retorna o nome do nó de destino, não um booleano
        return isComplete ? "Write" : "Search";
      }
      console.warn("Estado inválido ou sem propriedade isComplete:", state);
      return "Search"; // Retorna o nome do nó, não false
    },
    {
      "Write": "Write",
      "Search": "Search"
    }
  )
  .addEdge("Search", "Evaluate")
  .addEdge("Write", END);

export const researcher = graph.compile();
