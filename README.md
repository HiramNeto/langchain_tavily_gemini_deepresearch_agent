# Deep Research Agent

A powerful autonomous research agent built with LangChain, Google's Gemini AI models, and the Tavily search API. This agent takes a research question, conducts comprehensive web searches, evaluates information quality and completeness, and generates detailed research reports—all without human intervention.

![Deep Research Agent]

## 🛠️ Technologies
- TypeScript
- LangChain
- Gemini AI
- Tavily Search API
- Node.js

## 🧠 How It Works
This agent follows a research workflow implemented as a directed graph:

Plan → Search → Evaluate → [If complete] → Write → END
        ↑                       ↓
        └───[If incomplete]─────┘

1. **Planning**: Breaks down the research topic into specific search queries
2. **Searching**: Executes queries against the web using Tavily API
3. **Evaluating**: Assesses if sufficient information has been gathered
4. **Report Writing**: Generates a comprehensive, publication-quality report


## ✨ Key Features
- Autonomous multi-step research - conducts multiple search iterations without human intervention
- Intelligent query generation - creates targeted search queries based on the research topic
- Content summarization - extracts relevant information from search results
- Adaptive research depth - continues searching until sufficient information is gathered (up to a configurable limit)
- High-quality report generation - creates well-structured, comprehensive research reports
- Flexible model selection - uses different Gemini models optimized for each task

## 🚀 Installation

# Clone the repository
```
git clone https://github.com/yourusername/deep-research-agent.git
cd deep-research-agent
```
# Install dependencies
```
npm install
```
## ⚙️ Configuration
Create a .env file in the root directory with your API keys:
```
GOOGLE_API_KEY=your-gemini-api-key
TAVILY_API_KEY=your-tavily-api-key
```
## 📋 Usage
```
// Modify the research topic in src/index.ts
const researchTopic = "Your research topic here";
```
```
// Run the agent
npx ts-node src/index.ts
```
Example output:
```
--- RESEARCH COMPLETE ---
Topic: O que devo considerar ao comprar um carro elétrico no Brasil em 2025?

Title: Guia Completo para Compra de Carros Elétricos no Brasil em 2025

Report:
# Guia Completo para Compra de Carros Elétricos no Brasil em 2025

## Introdução
...
```
🏗️ Architecture
The agent is built using LangChain's StateGraph to orchestrate the research workflow. Each stage is implemented as a distinct node in the graph:
Plan Node: Generates targeted search queries using Gemini-2.5-pro-exp model
Search Node: Executes searches via Tavily API and processes results
Evaluation Node: Determines if research is complete or needs more information
Write Node: Generates final research report using Gemini's premium models

Model Selection Strategy
The agent uses different Gemini models for different tasks based on complexity and rate limits:
premiumPlus (gemini-2.5-pro-exp): Planning and report writing (most complex reasoning)
premium (gemini-2.5-flash-preview): Evaluations (balanced reasoning)
standard (gemini-2.0-flash): Filtering (intermediate tasks)
basic (gemini-2.0-flash-lite): Summarization (high-volume, simpler tasks)

🧩 Extending the Agent
This implementation provides a solid foundation that can be extended in various ways:
Add a web interface
Support for different output formats (PDF, presentation)
Implement source verification features
Add multimedia (image, video) search capabilities
Add domain-specific knowledge enhancements
Implement user feedback mechanisms

📚 Dependencies
Main dependencies include:
LangChain (@langchain/core, @langchain/langgraph)
Google Generative AI SDK (@google/generative-ai)
Tavily Search API (@langchain/tavily)
TypeScript and related tooling

🔧 Troubleshooting
API Rate Limits
The agent uses different Gemini models with varying rate limits. If you encounter rate limit errors:
Adjust the MAX_ITERATIONS constant in src/graph.ts
Implement retry logic with exponential backoff
Consider upgrading your API plan for higher rate limits

Model Selection
Different models have different capabilities. In the src/utils/gemini.ts file, you can modify which models are used for each task.

🤝 Contributing
Contributions are welcome! Please feel free to submit a Pull Request.