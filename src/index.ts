import dotenv from "dotenv";

// Load environment variables
dotenv.config();

import { researcher } from "./graph";


async function main() {
  try {
    // Define a research topic
    //const researchTopic = "Quem foi eleito presidente do brasil em 2022?";
    const researchTopic = "O que devo considerar ao comprar um carro elétrico no Brasil em 2025?";
    
    // Execute the research graph with the topic directly
    const result = await researcher.invoke({
      topic: researchTopic
    });
    
    // Output the results
    console.log("\n--- RESEARCH COMPLETE ---");
    console.log(`Topic: ${researchTopic}`);
    
    if (result.report) {
      console.log(`\nTitle: ${result.report.title}`);
      console.log(`\nReport:\n${result.report.content}`);
    } else {
      console.log("No report was generated");
    }
    
  } catch (error) {
    console.error("Research process failed:", error);
  }
}

// Run the main function
main();
