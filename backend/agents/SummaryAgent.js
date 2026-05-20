import { BaseAgent } from './BaseAgent.js';

export class SummaryAgent extends BaseAgent {
  constructor() {
    super('SummaryAgent', 'Core Concepts and Summary Specialist');
  }

  async receiveMessage(sender, message, payload) {
    if (message !== 'GENERATE_SUMMARY') {
      throw new Error(`Unsupported message command: ${message}`);
    }

    const { transcript, videoTitle, apiKey, mockMode } = payload;

    const systemInstruction = 
      `You are an expert Academic Summary Agent. Your goal is to analyze an educational video transcript and extract the core educational content.
      You must produce a JSON object containing a structured section-wise summary and a list of key concepts.
      
      Respond ONLY with a JSON object. Do not include markdown code block syntax (like \`\`\`json) in your response. Ensure the output is valid JSON.
      
      JSON Schema structure:
      {
        "summary": [
          {
            "sectionTitle": "Brief name of the section or topic",
            "bullets": [
              "Key explanation, fact, or details about the topic",
              "Another important takeaway or detail"
            ]
          }
        ],
        "keyConcepts": [
          {
            "concept": "Core term, formula, or concept name",
            "definition": "Concise, educational definition explaining the term and its significance"
          }
        ]
      }`;

    const userPrompt = `Video Title: ${videoTitle}\nCleaned Transcript:\n${transcript}`;

    const mockSummaryJSON = JSON.stringify({
      summary: [
        {
          sectionTitle: "Introduction to Algorithm Analysis",
          bullets: [
            "Algorithm complexity measures the performance of code based on execution time (time complexity) or memory consumption (space complexity).",
            "Big O notation is the standard mathematical notation used to describe how execution demands scale as the input size (n) grows."
          ]
        },
        {
          sectionTitle: "Common Time Complexities Analyzed",
          bullets: [
            "Linear Time (O(n)): Execution time grows in direct proportion to input size (e.g., iterating through a single array).",
            "Quadratic Time (O(n^2)): Execution time scales quadratically, typically seen in nested loops, which are inefficient for large datasets.",
            "Logarithmic Time (O(log n)): Scales very slowly and is highly efficient. This complexity is characteristic of algorithms like binary search."
          ]
        },
        {
          sectionTitle: "Space Complexity Definition",
          bullets: [
            "Space complexity evaluates how much additional memory or storage space an algorithm requires to run as a function of the input size."
          ]
        }
      ],
      keyConcepts: [
        {
          concept: "Big O Notation",
          definition: "A mathematical notation that describes the limiting behavior of a function when the argument tends towards a particular value or infinity, used in computer science to classify algorithms by runtime or space requirements."
        },
        {
          concept: "Time Complexity",
          definition: "A measure of the amount of time an algorithm takes to run as a function of the length of the input data."
        },
        {
          concept: "Space Complexity",
          definition: "A measure of the amount of working storage or memory that an algorithm needs to execute relative to the input size."
        },
        {
          concept: "O(log n) - Logarithmic Complexity",
          definition: "An algorithm runtime class that divides the problem size in half in each step (e.g., binary search), making it extremely fast for large datasets."
        }
      ]
    });

    const responseText = await this.callGemini(
      systemInstruction,
      userPrompt,
      apiKey,
      mockSummaryJSON,
      mockMode
    );

    // Clean JSON markdown wrappers if present
    let jsonText = responseText.trim();
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
    }

    try {
      const parsedData = JSON.parse(jsonText);
      return {
        summary: parsedData.summary || [],
        keyConcepts: parsedData.keyConcepts || []
      };
    } catch (error) {
      console.warn('Failed to parse Gemini JSON output for SummaryAgent. Falling back to parsing regex or raw text wrapper.', error);
      // Fail-safe parsing
      return {
        summary: [{ sectionTitle: "Overview of Topic", bullets: [responseText] }],
        keyConcepts: []
      };
    }
  }
}
