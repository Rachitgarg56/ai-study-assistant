/**
 * Orchestrates communication between multiple AI agents.
 * Implements a message-based coordinator pattern to log all transfers and
 * run workflows asynchronously.
 */
export class AgentCoordinator {
  constructor() {
    this.agents = {};
    this.logs = [];
    this.state = {};
  }

  /**
   * Registers an agent with the coordinator.
   * @param {string} name - Unique name of the agent
   * @param {BaseAgent} agent - Agent instance
   */
  registerAgent(name, agent) {
    this.agents[name] = agent;
    agent.setCoordinator(this);
  }

  /**
   * Logs a message interaction between agents.
   * @param {string} sender - Name of the sender agent
   * @param {string} receiver - Name of the receiver agent
   * @param {string} message - Type of message / command
   * @param {any} payload - Associated payload or data snippet
   */
  logMessage(sender, receiver, message, payload) {
    const textPreview = typeof payload === 'string' 
      ? (payload.length > 120 ? payload.substring(0, 120) + '...' : payload)
      : JSON.stringify(payload);

    const logEntry = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      sender,
      receiver,
      message,
      preview: textPreview,
      timestamp: new Date().toLocaleTimeString(),
    };
    
    console.log(`[Agent Communication] ${sender} -> ${receiver}: ${message}`);
    this.logs.push(logEntry);
  }

  /**
   * Sends a message to a specific agent and awaits its response.
   * @param {string} sender - Sender agent name
   * @param {string} receiver - Receiver agent name
   * @param {string} message - Command or action type
   * @param {any} payload - Input data
   * @returns {Promise<any>} Response from the receiver agent
   */
  async sendMessage(sender, receiver, message, payload) {
    this.logMessage(sender, receiver, message, payload);
    
    const agent = this.agents[receiver];
    if (!agent) {
      throw new Error(`Agent '${receiver}' is not registered with the coordinator.`);
    }

    try {
      return await agent.receiveMessage(sender, message, payload);
    } catch (error) {
      console.error(`Error in agent '${receiver}' processing message '${message}':`, error);
      throw error;
    }
  }

  /**
   * Runs the complete multi-agent workflow.
   * @param {object} input - { url: string, manualTranscript: string, apiKey: string, mockMode: boolean }
   * @returns {Promise<{ result: string, logs: array }>}
   */
  async run(input) {
    this.logs = []; // Reset logs for this run
    this.state = {
      youtubeUrl: input.url || null,
      rawTranscript: input.manualTranscript || null,
      apiKey: input.apiKey || null,
      mockMode: !!input.mockMode,
    };

    try {
      this.logMessage('User', 'Coordinator', 'START_WORKFLOW', { 
        url: this.state.youtubeUrl, 
        hasManualTranscript: !!this.state.rawTranscript,
        mockMode: this.state.mockMode 
      });

      // Step 1: Request transcript cleaning from TranscriptAgent
      const transcriptInput = {
        url: this.state.youtubeUrl,
        rawText: this.state.rawTranscript,
        apiKey: this.state.apiKey,
        mockMode: this.state.mockMode
      };
      
      const transcriptResult = await this.sendMessage(
        'Coordinator', 
        'TranscriptAgent', 
        'CLEAN_TRANSCRIPT', 
        transcriptInput
      );

      this.state.cleanedTranscript = transcriptResult.cleanedText;
      this.state.videoTitle = transcriptResult.videoTitle || 'YouTube Study Session';

      // Step 2: Run Summary, Quiz, and Flashcard Agents in parallel
      const agentPayload = {
        transcript: this.state.cleanedTranscript,
        videoTitle: this.state.videoTitle,
        apiKey: this.state.apiKey,
        mockMode: this.state.mockMode
      };

      const [summaryResult, quizResult, flashcardResult] = await Promise.all([
        this.sendMessage('Coordinator', 'SummaryAgent', 'GENERATE_SUMMARY', agentPayload),
        this.sendMessage('Coordinator', 'QuizAgent', 'GENERATE_QUIZ', agentPayload),
        this.sendMessage('Coordinator', 'FlashcardAgent', 'GENERATE_FLASHCARDS', agentPayload)
      ]);

      this.state.summary = summaryResult.summary;
      this.state.keyConcepts = summaryResult.keyConcepts;
      this.state.quiz = quizResult.quiz;
      this.state.flashcards = flashcardResult.flashcards;

      // Step 3: Format the outputs into a single markdown document
      const formatPayload = {
        videoTitle: this.state.videoTitle,
        youtubeUrl: this.state.youtubeUrl,
        summary: this.state.summary,
        keyConcepts: this.state.keyConcepts,
        quiz: this.state.quiz,
        flashcards: this.state.flashcards,
        mockMode: this.state.mockMode
      };

      const formattingResult = await this.sendMessage(
        'Coordinator', 
        'FormatterAgent', 
        'FORMAT_STUDY_MATERIAL', 
        formatPayload
      );

      this.logMessage('Coordinator', 'User', 'WORKFLOW_COMPLETE', 'Successfully compiled study guide');

      return {
        success: true,
        videoTitle: this.state.videoTitle,
        markdown: formattingResult.markdown,
        structuredData: {
          summary: this.state.summary,
          keyConcepts: this.state.keyConcepts,
          quiz: this.state.quiz,
          flashcards: this.state.flashcards
        },
        logs: this.logs
      };

    } catch (error) {
      this.logMessage('Coordinator', 'User', 'WORKFLOW_FAILED', error.message);
      return {
        success: false,
        error: error.message,
        logs: this.logs
      };
    }
  }
}
