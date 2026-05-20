import { BaseAgent } from './BaseAgent.js';
import { fetchTranscript, formatTranscriptSegments } from '../services/youtubeService.js';

export class TranscriptAgent extends BaseAgent {
  constructor() {
    super('TranscriptAgent', 'Transcript Cleaning and Extraction Expert');
  }

  async receiveMessage(sender, message, payload) {
    if (message !== 'CLEAN_TRANSCRIPT') {
      throw new Error(`Unsupported message command: ${message}`);
    }

    const { url, rawText, apiKey, mockMode } = payload;
    let rawTranscriptContent = '';
    let videoTitle = 'Custom Uploaded Transcript';

    // If mock mode is on and a URL is provided, we simulate fetching the transcript
    if (mockMode) {
      videoTitle = url ? 'Introduction to Big O Notation and Algorithm Complexity' : 'Custom Uploaded Transcript';
      rawTranscriptContent = url 
        ? `[Music] Hello everyone! Today, um, we're basically going to talk about Big O notation, you know, which is a super important concept in computer science. Um, so when you write code, you want to know, like, how fast it runs or how much memory it uses. Basically, that's what algorithm complexity is. Uh, let's say you have a loop that goes through an array of size n. That run time is, you know, O(n) because it grows linearly with the size of n. If you have nested loops, like a loop inside a loop, that's, uh, quadratic complexity, or O(n squared). And if you're using a binary search, that's O(log n), which is, like, way faster than linear search for large data. We'll be looking at space complexity as well, which is how much memory your algorithm consumes. Thanks for watching, let's dive in!`
        : (rawText || 'No transcript text provided.');
    } else {
      // Real mode: Fetch transcript if URL is provided and rawText is empty
      if (url && !rawText) {
        try {
          const segments = await fetchTranscript(url);
          rawTranscriptContent = formatTranscriptSegments(segments, false);
          videoTitle = `YouTube Video Session (${url.substring(url.indexOf('v=') + 2, url.indexOf('v=') + 13) || 'Processed'})`;
        } catch (error) {
          throw new Error(error.message);
        }
      } else if (rawText) {
        rawTranscriptContent = rawText;
      } else {
        throw new Error('Please provide either a YouTube video URL or paste a raw transcript.');
      }
    }

    // Now, clean up the transcript using Gemini API (or Mock Mode)
    const systemInstruction = 
      `You are the Transcript Clean-up Specialist. Your task is to process a raw, auto-generated transcript of an educational video.
      Follow these instructions strictly:
      1. Remove filler words (like 'um', 'uh', 'so', 'you know', 'basically', 'like').
      2. Remove background audio indicators (like '[Music]', '[Applause]', '[Laughter]').
      3. Fix obvious phonetic speech-to-text transcription typos (e.g., 'big oh' -> 'Big O', 'on square' -> 'O(n^2)').
      4. Format the text into clean, grammatically correct paragraphs with appropriate capitalization and punctuation.
      5. Do NOT summarize or delete any educational content, explanations, or terminology. Keep all explanations intact.
      6. Maintain the speaker's first-person perspective (do not change 'I am going to explain' to 'The speaker explains').`;

    const userPrompt = `Here is the raw transcript:\n\n${rawTranscriptContent}`;

    const mockCleanedResponse = 
      `Hello everyone! Today we're going to talk about Big O notation, which is a super important concept in computer science. When you write code, you want to know how fast it runs or how much memory it uses. That is what algorithm complexity is.
      
      Let's say you have a loop that goes through an array of size n. That run time is O(n) because it grows linearly with the size of n. If you have nested loops, like a loop inside a loop, that is quadratic complexity, or O(n^2). And if you are using a binary search, that is O(log n), which is way faster than a linear search for large data. We will also be looking at space complexity, which measures how much memory your algorithm consumes. Let's dive in!`;

    const cleanedText = await this.callGemini(
      systemInstruction,
      userPrompt,
      apiKey,
      mockCleanedResponse,
      mockMode
    );

    return {
      videoTitle,
      cleanedText: cleanedText.trim()
    };
  }
}
