import { BaseAgent } from './BaseAgent.js';

export class FlashcardAgent extends BaseAgent {
  constructor() {
    super('FlashcardAgent', 'Interactive Revision and Memory Retention Agent');
  }

  async receiveMessage(sender, message, payload) {
    if (message !== 'GENERATE_FLASHCARDS') {
      throw new Error(`Unsupported message command: ${message}`);
    }

    const { transcript, videoTitle, apiKey, mockMode } = payload;

    const systemInstruction = 
      `You are an expert Revision and Memory Engineering Agent. Your goal is to review a video transcript and formulate quick-revision flashcards.
      
      Generate between 5 to 8 high-value flashcards that cover critical facts, terms, formulas, rules, or core processes from the transcript.
      Keep the card fronts (questions/prompts) concise and engaging. Keep the card backs (answers/explanations) punchy and revision-friendly (ideally under 2-3 sentences).
      
      Respond ONLY with a JSON array containing the flashcards. Do not include markdown code block syntax (like \`\`\`json) in your response. Ensure the output is valid JSON.
      
      JSON Schema structure:
      [
        {
          "front": "The short question, term, or prompt on the front of the card",
          "back": "The concise, clear answer or explanation on the back of the card"
        }
      ]`;

    const userPrompt = `Video Title: ${videoTitle}\nCleaned Transcript:\n${transcript}`;

    const mockFlashcardsJSON = JSON.stringify([
      {
        front: "What does 'n' represent in algorithmic complexity analyses like O(n)?",
        back: "It represents the size of the input data (such as the number of elements in an array or list) processed by the algorithm."
      },
      {
        front: "State the time complexity of a simple loop going through 'n' items once.",
        back: "O(n) - also known as linear time complexity, where execution time grows proportionally to the input size."
      },
      {
        front: "What is the time complexity of nested loops (loop inside a loop, both up to size n)?",
        back: "O(n^2) - quadratic time complexity. The run time grows dramatically as input size n increases, making it inefficient for large inputs."
      },
      {
        front: "Why is binary search classified as O(log n)?",
        back: "Because it halves the remaining search range at each step. This logarithmic reduction makes search times scale extremely slowly."
      },
      {
        front: "Briefly differentiate between time complexity and space complexity.",
        back: "Time complexity measures the execution time scalability relative to input size, whereas space complexity measures additional memory consumption scalability."
      }
    ]);

    const responseText = await this.callGemini(
      systemInstruction,
      userPrompt,
      apiKey,
      mockFlashcardsJSON,
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
        flashcards: Array.isArray(parsedData) ? parsedData : []
      };
    } catch (error) {
      console.warn('Failed to parse Gemini JSON output for FlashcardAgent. Returning an empty flashcards array.', error);
      return {
        flashcards: []
      };
    }
  }
}
