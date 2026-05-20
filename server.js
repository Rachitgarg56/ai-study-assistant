import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Import Coordinator and Agents
import { AgentCoordinator } from './backend/coordinator.js';
import { TranscriptAgent } from './backend/agents/TranscriptAgent.js';
import { SummaryAgent } from './backend/agents/SummaryAgent.js';
import { QuizAgent } from './backend/agents/QuizAgent.js';
import { FlashcardAgent } from './backend/agents/FlashcardAgent.js';
import { FormatterAgent } from './backend/agents/FormatterAgent.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS and body parsing
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Support larger manual transcript uploads

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));

/**
 * REST Endpoint to coordinate the multi-agent study guide generation.
 * Request Body:
 * - url (string, optional)
 * - manualTranscript (string, optional)
 * - apiKey (string, optional) - Client-supplied Gemini API key
 * - mockMode (boolean, optional) - True to run in offline demo mode
 */
app.post('/api/process', async (req, res) => {
  const { url, manualTranscript, apiKey, mockMode } = req.body;

  if (!url && !manualTranscript) {
    return res.status(400).json({
      success: false,
      error: 'Please provide either a YouTube video URL or paste a transcript manually.'
    });
  }

  // Create coordinator and register agents
  const coordinator = new AgentCoordinator();
  coordinator.registerAgent('TranscriptAgent', new TranscriptAgent());
  coordinator.registerAgent('SummaryAgent', new SummaryAgent());
  coordinator.registerAgent('QuizAgent', new QuizAgent());
  coordinator.registerAgent('FlashcardAgent', new FlashcardAgent());
  coordinator.registerAgent('FormatterAgent', new FormatterAgent());

  try {
    const result = await coordinator.run({
      url,
      manualTranscript,
      apiKey,
      mockMode
    });

    if (result.success) {
      return res.json(result);
    } else {
      return res.status(500).json(result);
    }
  } catch (error) {
    console.error('Server error during agent processing:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'An unexpected error occurred during multi-agent coordination.',
      logs: coordinator.logs || []
    });
  }
});

// Fallback to index.html for SPA routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`  Multi-Agent AI Study Assistant Server is running`);
  console.log(`  Local URL: http://localhost:${PORT}`);
  console.log(`==================================================`);
});
