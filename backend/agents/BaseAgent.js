import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

/**
 * Base Agent class that provides common utilities for AI agents.
 * This includes calling the Gemini API and coordinating message passing.
 */
export class BaseAgent {
  /**
   * @param {string} name - The agent's name (e.g., 'SummaryAgent')
   * @param {string} role - The agent's functional role description
   */
  constructor(name, role) {
    this.name = name;
    this.role = role;
    this.coordinator = null;
  }

  /**
   * Sets the coordinator instance.
   * @param {AgentCoordinator} coordinator
   */
  setCoordinator(coordinator) {
    this.coordinator = coordinator;
  }

  /**
   * Abstract message receiver. Subclasses must implement this.
   * @param {string} sender - Name of the sender
   * @param {string} message - Type of message / command
   * @param {any} payload - Message payload
   * @returns {Promise<any>}
   */
  async receiveMessage(sender, message, payload) {
    throw new Error(`Agent ${this.name} must implement receiveMessage()`);
  }

  /**
   * Helper method to send a message back to the coordinator or another agent.
   * @param {string} receiver - Name of the receiver agent
   * @param {string} message - Command/Action
   * @param {any} payload - Content
   */
  async sendMessage(receiver, message, payload) {
    if (!this.coordinator) {
      throw new Error(`Coordinator not set for agent ${this.name}`);
    }
    return await this.coordinator.sendMessage(this.name, receiver, message, payload);
  }

  /**
   * Interfaces with the Gemini Generative AI model.
   * @param {string} systemInstruction - Developer/System instructions to guide LLM behavior
   * @param {string} prompt - The user prompt
   * @param {string} [clientApiKey] - Optional client-supplied API key
   * @param {string} [mockResponse] - Optional mock response if in mock mode
   * @param {boolean} [mockMode] - Flag to force mock behavior
   * @returns {Promise<string>} Text output from the model
   */
  async callGemini(systemInstruction, prompt, clientApiKey = null, mockResponse = '', mockMode = false) {
    if (mockMode) {
      // Simulate slight delay for realistic agent feel
      await new Promise(resolve => setTimeout(resolve, 800));
      return mockResponse || `[Mock response from ${this.name} due to active Mock Mode]`;
    }

    // Resolve API key: Client-supplied key takes priority, then server environment variable
    const apiKey = clientApiKey || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error(
        `Gemini API Key is missing for ${this.name}. ` +
        `Please configure GEMINI_API_KEY in the server .env file or enter your own API key in the client Settings.`
      );
    }

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      
      // Use the standard and fast gemini-2.5-flash model
      const model = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        systemInstruction: systemInstruction,
      });

      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error(`Gemini API Error in ${this.name}:`, error);
      throw new Error(`[${this.name} API Error] ${error.message}`);
    }
  }
}
