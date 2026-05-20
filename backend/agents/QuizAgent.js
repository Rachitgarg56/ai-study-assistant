import { BaseAgent } from './BaseAgent.js';

export class QuizAgent extends BaseAgent {
  constructor() {
    super('QuizAgent', 'Assessment and Quiz Engineering Agent');
  }

  async receiveMessage(sender, message, payload) {
    if (message !== 'GENERATE_QUIZ') {
      throw new Error(`Unsupported message command: ${message}`);
    }

    const { transcript, videoTitle, apiKey, mockMode } = payload;

    const systemInstruction = 
      `You are an expert Educational Assessment Specialist. Your goal is to review a video transcript and create an engaging, educational multiple-choice quiz.
      
      Create exactly 5 high-quality, conceptual multiple-choice questions testing key concepts from the transcript.
      For each question, provide exactly 4 options. Make the questions challenging and focused on learning verification, rather than trivia.
      
      Respond ONLY with a JSON array containing the questions. Do not include markdown code block syntax (like \`\`\`json) in your response. Ensure the output is valid JSON.
      
      JSON Schema structure:
      [
        {
          "question": "The question prompt text",
          "options": [
            "Option A",
            "Option B",
            "Option C",
            "Option D"
          ],
          "answerIndex": 0, // 0-based index corresponding to the correct option (0, 1, 2, or 3)
          "explanation": "A complete, educational explanation detailing why the correct answer is right and why other options are incorrect or less suitable."
        }
      ]`;

    const userPrompt = `Video Title: ${videoTitle}\nCleaned Transcript:\n${transcript}`;

    const mockQuizJSON = JSON.stringify([
      {
        question: "Which of the following best describes the core purpose of Big O notation?",
        options: [
          "To measure the precise execution time of an algorithm in milliseconds",
          "To classify algorithms according to how their run time or space requirements grow as the input size increases",
          "To optimize compiler execution paths for deep nested loops",
          "To calculate the total memory consumed by active thread states on a server"
        ],
        answerIndex: 1,
        explanation: "Big O notation measures algorithm scalability. It does not output milliseconds (which depends on physical hardware performance) but rather defines how runtime requirements scale relative to input size (n)."
      },
      {
        question: "If an algorithm contains a single loop that traverses an array of size 'n', what is its time complexity classification?",
        options: [
          "O(1)",
          "O(log n)",
          "O(n)",
          "O(n^2)"
        ],
        answerIndex: 2,
        explanation: "Traversing an array once requires inspecting each element. Because the work is proportional to the number of elements 'n', the growth rate is linear, represented mathematically as O(n)."
      },
      {
        question: "Why are nested loops (a loop inside another loop, both iterating up to 'n') generally considered inefficient for large datasets?",
        options: [
          "They have quadratic complexity, meaning execution time grows much faster than the input size (O(n^2))",
          "They cannot be compiled into native CPU instruction sets",
          "They automatically result in stack overflow errors on modern systems",
          "They have O(log n) complexity, which is highly unstable"
        ],
        answerIndex: 0,
        explanation: "Nested loops execute the inner loop 'n' times for each of the 'n' iterations of the outer loop, yielding n * n operations. This O(n^2) quadratic complexity causes execution times to balloon rapidly as 'n' gets large."
      },
      {
        question: "Which algorithmic complexity class is characteristic of a binary search algorithm?",
        options: [
          "O(1)",
          "O(log n)",
          "O(n)",
          "O(n^2)"
        ],
        answerIndex: 1,
        explanation: "Binary search repeatedly halves the search space. This step-by-step reduction of the problem size represents a logarithmic scale, written as O(log n), which is highly efficient for large datasets."
      },
      {
        question: "What does 'space complexity' measure?",
        options: [
          "The file storage footprint of the compiled program executable",
          "The runtime duration required by an algorithm to write to a hard drive",
          "The amount of working storage or memory that an algorithm requires as a function of the input size",
          "The layout density of RAM modules in a motherboard"
        ],
        answerIndex: 2,
        explanation: "Space complexity is a theoretical measure that describes the amount of transient RAM or working memory an algorithm utilizes relative to the size of the input data 'n' during execution."
      }
    ]);

    const responseText = await this.callGemini(
      systemInstruction,
      userPrompt,
      apiKey,
      mockQuizJSON,
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
        quiz: Array.isArray(parsedData) ? parsedData : []
      };
    } catch (error) {
      console.warn('Failed to parse Gemini JSON output for QuizAgent. Returning an empty quiz array.', error);
      return {
        quiz: []
      };
    }
  }
}
